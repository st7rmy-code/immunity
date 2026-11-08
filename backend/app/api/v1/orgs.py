"""Организации: создание (admin), участники (admin / org_admin своей организации), обезличенная сводка.

Модель доступа к данным:
- learner видит только свои попытки и проверки;
- teacher и org_admin видят сводку своей организации только по тем, кто дал согласие share_with_org,
  и только если таких людей не меньше org_min_group (иначе сводка не показывается);
- admin видит сводку любой организации на тех же условиях обезличивания.
Индивидуальных результатов других людей API не отдаёт никому.
"""
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select

from app.api.deps import DB, CurrentUser, audit, require
from app.core.config import get_settings
from app.core.errors import ApiError
from app.domain import skills as sk
from app.models import Organization, Scenario, Skill, TrainingAttempt, User
from app.schemas import MemberIn, MemberOut, OrgIn, OrgOut, OrgSkill, OrgSummary

router = APIRouter(prefix="/organizations", tags=["organizations"])


def _org(db, org_id: int) -> Organization:
    o = db.get(Organization, org_id)
    if not o:
        raise ApiError(404, "not_found", "Организация не найдена")
    return o


def _can_manage(u: User, org_id: int) -> bool:
    return u.role == "admin" or (u.role == "org_admin" and u.organization_id == org_id)


@router.post("", response_model=OrgOut, status_code=status.HTTP_201_CREATED, summary="Создать организацию (admin)")
def create_org(body: OrgIn, db: DB, u: User = Depends(require("admin"))):
    o = Organization(name=body.name, kind=body.kind)
    db.add(o)
    db.flush()
    audit(db, "org.create", u.id, f"org:{o.id}")
    db.commit()
    return o


@router.post("/{org_id}/members", response_model=MemberOut, summary="Добавить зарегистрированного пользователя в организацию",
             description="Согласие на сводку (share_with_org) при этом не включается: его даёт сам пользователь.")
def add_member(org_id: int, body: MemberIn, db: DB, u: CurrentUser):
    _org(db, org_id)
    if not _can_manage(u, org_id):
        raise ApiError(403, "forbidden", "Недостаточно прав")
    if body.role == "org_admin" and u.role != "admin":
        raise ApiError(403, "forbidden", "Назначать администраторов организации может только администратор платформы")
    m = db.scalar(select(User).where(User.email == body.email.lower()))
    if not m:
        raise ApiError(404, "not_found", "Пользователь с таким email не зарегистрирован")
    if m.role == "admin":
        raise ApiError(409, "conflict", "Администратора платформы нельзя добавить в организацию")
    if m.organization_id not in (None, org_id):
        raise ApiError(409, "conflict", "Пользователь уже состоит в другой организации")
    if m.organization_id != org_id:
        m.share_with_org = False  # согласие даётся каждой организации заново
    m.organization_id, m.role = org_id, body.role
    m.token_version += 1  # роль изменилась — старые токены недействительны
    audit(db, "org.member_set", u.id, f"user:{m.id}", org=org_id, role=body.role)
    db.commit()
    return MemberOut(user_id=m.id, role=m.role, organization_id=org_id)


@router.get("/{org_id}/summary", response_model=OrgSummary, summary="Обезличенная сводка по навыкам")
def summary(org_id: int, db: DB, u: CurrentUser):
    o = _org(db, org_id)
    if not (u.role == "admin" or (u.role in ("org_admin", "teacher") and u.organization_id == org_id)):
        raise ApiError(403, "forbidden", "Недостаточно прав")
    s = get_settings()
    total = db.scalar(select(func.count()).select_from(User).where(User.organization_id == org_id, User.is_active)) or 0
    sharing_ids = list(db.scalars(select(User.id).where(User.organization_id == org_id, User.is_active, User.share_with_org)))
    enough = len(sharing_ids) >= s.org_min_group
    audit(db, "org.summary_view", u.id, f"org:{org_id}", enough=enough)
    db.commit()
    if not enough:
        return OrgSummary(organization=OrgOut.model_validate(o), members_total=total, members_sharing=len(sharing_ids), min_group=s.org_min_group,
                          enough_data=False, skills=[], attempts_30d=None,
                          note=f"Сводка появится, когда согласие дадут не меньше {s.org_min_group} человек: так нельзя вычислить результат одного человека.")
    skills = list(db.scalars(select(Skill).order_by(Skill.position)))
    rows = db.execute(select(TrainingAttempt.user_id, TrainingAttempt.skill_slug, TrainingAttempt.level, TrainingAttempt.score, TrainingAttempt.created_at, Scenario.kind, Scenario.slug)
                      .join(Scenario, Scenario.id == TrainingAttempt.scenario_id).where(TrainingAttempt.user_id.in_(sharing_ids))).all()
    per_user: dict = {}
    for r in rows:
        per_user.setdefault(r.user_id, []).append(sk.Evidence(kind=r.kind, scenario=r.slug, skill=r.skill_slug, level=r.level, score=float(r.score), at=r.created_at))
    agg = {x.slug: [] for x in skills}
    for ev in per_user.values():
        st = sk.estimate(ev, list(agg))
        for slug, v in st.items():
            if v.n >= 0.5:  # тот же порог, что для индекса
                agg[slug].append(v.mean)
    since = datetime.now(UTC) - timedelta(days=30)
    a30 = sum(1 for r in rows if r.created_at >= since)
    out = [OrgSkill(skill=x.slug, title=x.title, mean=round(sum(agg[x.slug]) / len(agg[x.slug]), 3), learners=len(agg[x.slug]))
           for x in skills if len(agg[x.slug]) >= s.org_min_group]
    return OrgSummary(organization=OrgOut.model_validate(o), members_total=total, members_sharing=len(sharing_ids), min_group=s.org_min_group,
                      enough_data=True, skills=out, attempts_30d=a30,
                      note="Средние оценки навыков по участникам, давшим согласие. Темы, где данных меньше чем у "
                           f"{s.org_min_group} человек, скрыты. Учебная оценка, не результат аттестации.")
