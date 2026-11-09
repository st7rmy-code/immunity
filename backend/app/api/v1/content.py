import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import any_, exists, select
from sqlalchemy.orm import load_only, selectinload

from app.api.deps import DB
from app.core.config import get_settings
from app.core.errors import ApiError
from app.models import Audience, Scenario, ScenarioLine, Skill
from app.schemas import Kind, ScenarioBrief, ScenarioDetail, ScenarioLineOut, SkillRef

router = APIRouter(tags=["content"])


@lru_cache
def _content() -> dict:
    return json.loads((Path(__file__).resolve().parents[2] / "seed" / "content.json").read_text(encoding="utf-8"))


@router.get("/guides", summary="Памятки: «если уже попались», законы, настройки защиты",
            description="Справочный контент из прототипа. У правовых утверждений — источник и дата проверки.")
def guides() -> dict:
    c = _content()
    return {**c["guides"], "sources": {s["slug"]: {"name": s["name"], "date": s["date"], "url": s["url"], "checked": s["checked"]} for s in c["sources"]}}


def brief(s: Scenario, has_audio: bool | None = None) -> ScenarioBrief:
    audio = has_audio if has_audio is not None else any(ln.audio_path for ln in s.lines)
    return ScenarioBrief(kind=s.kind, slug=s.slug, title=s.title, skill=s.skill_slug, level=s.level, audiences=s.audiences or [], has_audio=audio)


@router.get("/skills", response_model=list[SkillRef], summary="Навыки (темы)")
def skills(db: DB):
    return list(db.scalars(select(Skill).order_by(Skill.position)))


@router.get("/audiences", summary="Аудитории")
def audiences(db: DB) -> list[dict]:
    return [{"slug": a.slug, "title": a.title, "hint": a.hint} for a in db.scalars(select(Audience).order_by(Audience.slug))]


@router.get("/scenarios", response_model=list[ScenarioBrief], summary="Сценарии тренировок",
            description="Список без ответов: признак «честный/мошеннический» в списке не раскрывается.")
def scenarios(db: DB, kind: Kind | None = None, skill: Annotated[str | None, Query(max_length=32)] = None,
              audience: Annotated[str | None, Query(max_length=20)] = None):
    # Только нужные колонки и EXISTS по аудио: без содержимого сценариев (JSONB) и текста реплик.
    has_audio = exists().where(ScenarioLine.scenario_id == Scenario.id, ScenarioLine.audio_path.is_not(None)).label("has_audio")
    q = (select(Scenario, has_audio).where(Scenario.is_active)
         .options(load_only(Scenario.kind, Scenario.slug, Scenario.title, Scenario.skill_slug, Scenario.level, Scenario.audiences))
         .order_by(Scenario.kind, Scenario.level, Scenario.id))
    if kind:
        q = q.where(Scenario.kind == kind)
    if skill:
        q = q.where(Scenario.skill_slug == skill)
    if audience:
        q = q.where(any_(Scenario.audiences) == audience)
    return [brief(s, bool(a)) for s, a in db.execute(q)]


@router.get("/scenarios/{kind}/{slug}", response_model=ScenarioDetail, summary="Сценарий целиком",
            description="Содержимое для движка тренажёра. Движок работает в браузере, поэтому ответы в нём есть: "
                        "для обучения это допустимо, для аттестации — нет.")
def scenario(kind: Kind, slug: str, db: DB):
    s = db.scalar(select(Scenario).where(Scenario.kind == kind, Scenario.slug == slug, Scenario.is_active).options(selectinload(Scenario.lines)))
    if not s:
        raise ApiError(404, "not_found", "Сценарий не найден")
    base = get_settings().audio_base_url
    b = brief(s)
    return ScenarioDetail(**b.model_dump(), markers=s.markers or [], content=s.content,
                          lines=[ScenarioLineOut(position=ln.position, text=ln.text, speaker=ln.speaker,
                                                 audio_url=(base + ln.audio_path.removeprefix("v/")) if ln.audio_path else None,
                                                 duration_s=ln.duration_s) for ln in s.lines])
