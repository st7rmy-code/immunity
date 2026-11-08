"""Загрузка контента прототипа в БД (идемпотентно): python -m app.seed.load

Источник — app/seed/content.json, его создаёт prototype/tools/export-content.cjs из src/ прототипа.
Сценарии, которых больше нет в файле, не удаляются (на них могут ссылаться попытки), а скрываются (is_active=false).
"""
import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.db import get_sessionmaker
from app.models import Audience, Marker, Scenario, ScenarioLine, Skill

CONTENT = Path(__file__).resolve().parent / "content.json"


def load(db: Session, path: Path = CONTENT) -> dict:
    c = json.loads(path.read_text(encoding="utf-8"))
    for i, s in enumerate(c["skills"]):
        db.execute(insert(Skill).values(slug=s["slug"], title=s["title"], description=s["description"], position=i)
                   .on_conflict_do_update(index_elements=["slug"], set_={"title": s["title"], "description": s["description"], "position": i}))
    for m in c["markers"]:
        db.execute(insert(Marker).values(slug=m["slug"], title=m["title"]).on_conflict_do_update(index_elements=["slug"], set_={"title": m["title"]}))
    for a in c["audiences"]:
        db.execute(insert(Audience).values(slug=a["slug"], title=a["title"], hint=a.get("hint") or "")
                   .on_conflict_do_update(index_elements=["slug"], set_={"title": a["title"], "hint": a.get("hint") or ""}))
    db.flush()
    existing = {(s.kind, s.slug): s for s in db.scalars(select(Scenario))}
    seen = set()
    for x in c["scenarios"]:
        key = (x["kind"], x["slug"])
        seen.add(key)
        s = existing.get(key) or Scenario(kind=x["kind"], slug=x["slug"])
        s.title, s.skill_slug, s.level, s.honest = x["title"][:240], x["skill"], int(x["level"] or 1), bool(x["honest"])
        s.audiences, s.markers, s.content, s.is_active = list(x["audiences"]), list(x["markers"]), x["content"], True
        if s.id is not None and s.lines:
            s.lines.clear()
            db.flush()  # старые реплики удаляются до вставки новых (уникальность scenario_id + position)
        s.lines = [ScenarioLine(position=i, text=ln["text"], speaker=ln["speaker"], audio_path=ln["audio"], duration_s=ln["duration"])
                   for i, ln in enumerate(x["lines"])]
        db.add(s)
    hidden = 0
    for key, s in existing.items():
        if key not in seen and s.is_active:
            s.is_active = False
            hidden += 1
    db.commit()
    return {"skills": len(c["skills"]), "markers": len(c["markers"]), "scenarios": len(c["scenarios"]), "hidden": hidden,
            "lines_with_audio": sum(1 for x in c["scenarios"] for ln in x["lines"] if ln["audio"])}


if __name__ == "__main__":
    with get_sessionmaker()() as db:
        print(load(db))
