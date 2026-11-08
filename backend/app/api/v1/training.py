from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import DB, CurrentUser
from app.core.errors import ApiError
from app.domain import skills as sk
from app.models import Marker, Scenario, Skill, TrainingAttempt
from app.schemas import AttemptIn, AttemptOut, Kind, Page, SkillsOut, SkillState

router = APIRouter(tags=["training"])
HISTORY_FOR_INDEX = 800  # как в прототипе: оценка по последним 800 попыткам


def out(a: TrainingAttempt) -> AttemptOut:
    return AttemptOut(id=a.id, kind=a.scenario.kind, scenario=a.scenario.slug, title=a.scenario.title, skill=a.skill_slug, level=a.level,
                      result=a.result, score=float(a.score), markers=a.markers or [], duration_ms=a.duration_ms, phase=a.phase,
                      legit=a.legit, false_positive=a.false_positive, source=a.source, created_at=a.created_at)


@router.post("/attempts", response_model=AttemptOut, status_code=status.HTTP_201_CREATED, summary="Сохранить результат тренировки",
             description="Навык, сложность и признак честного сценария берутся из базы, а не из запроса.")
def create_attempt(body: AttemptIn, u: CurrentUser, db: DB):
    s = db.scalar(select(Scenario).where(Scenario.kind == body.kind, Scenario.slug == body.scenario, Scenario.is_active))
    if not s:
        raise ApiError(422, "validation_error", "Проверьте поля запроса", {"scenario": "Неизвестный сценарий"})
    if body.markers:
        known = set(db.scalars(select(Marker.slug).where(Marker.slug.in_(body.markers))))
        bad = [m for m in body.markers if m not in known]
        if bad:
            raise ApiError(422, "validation_error", "Проверьте поля запроса", {"markers": "Неизвестные приёмы: " + ", ".join(bad[:3])})
    if body.false_positive and not s.honest:
        raise ApiError(422, "validation_error", "Проверьте поля запроса", {"false_positive": "Лишняя тревога бывает только в честном сценарии"})
    a = TrainingAttempt(user_id=u.id, scenario_id=s.id, skill_slug=s.skill_slug, level=s.level, result=body.result, score=round(body.score, 3),
                        markers=list(dict.fromkeys(body.markers)), duration_ms=body.duration_ms, phase=body.phase, legit=s.honest,
                        false_positive=body.false_positive, source="app", created_at=datetime.now(UTC))
    db.add(a)
    db.commit()
    db.refresh(a)
    return out(a)


@router.get("/attempts", response_model=Page[AttemptOut], summary="История своих тренировок (новые сверху)")
def list_attempts(u: CurrentUser, db: DB, limit: Annotated[int, Query(ge=1, le=200)] = 50, offset: Annotated[int, Query(ge=0, le=100_000)] = 0,
                  kind: Kind | None = None):
    where = [TrainingAttempt.user_id == u.id]
    if kind:
        where.append(TrainingAttempt.scenario.has(Scenario.kind == kind))
    total = db.scalar(select(func.count()).select_from(TrainingAttempt).where(*where)) or 0
    rows = db.scalars(select(TrainingAttempt).where(*where).options(selectinload(TrainingAttempt.scenario))
                      .order_by(TrainingAttempt.created_at.desc(), TrainingAttempt.id.desc()).limit(limit).offset(offset))
    return Page[AttemptOut](items=[out(a) for a in rows], total=total, limit=limit, offset=offset)


@router.get("/skills/me", response_model=SkillsOut, summary="Оценка навыков и индекс по своим попыткам")
def my_skills(u: CurrentUser, db: DB):
    skills = list(db.scalars(select(Skill).order_by(Skill.position)))
    rows = db.execute(select(TrainingAttempt.skill_slug, TrainingAttempt.level, TrainingAttempt.score, TrainingAttempt.created_at, Scenario.kind, Scenario.slug)
                      .join(Scenario, Scenario.id == TrainingAttempt.scenario_id).where(TrainingAttempt.user_id == u.id)
                      .order_by(TrainingAttempt.created_at.desc()).limit(HISTORY_FOR_INDEX)).all()
    ev = [sk.Evidence(kind=r.kind, scenario=r.slug, skill=r.skill_slug, level=r.level, score=float(r.score), at=r.created_at) for r in rows]
    st = sk.estimate(ev, [s.slug for s in skills])
    return SkillsOut(skills=[SkillState(skill=s.slug, title=s.title, mean=round(st[s.slug].mean, 4), sd=round(st[s.slug].sd, 4),
                                        evidence=round(st[s.slug].n, 3), attempts=st[s.slug].cnt, status=sk.status(st[s.slug])) for s in skills],
                     index=sk.overall(st), note="Учебная оценка по вашим попыткам в тренажёре. Не гарантия защиты от мошенников.")
