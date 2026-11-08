from fastapi import APIRouter
from sqlalchemy import delete, func, select

from app.api.deps import DB, CurrentUser, audit
from app.core.errors import ApiError
from app.domain import progress_import
from app.models import Audience, Marker, Scenario, ThreatCheck, TrainingAttempt
from app.schemas import ImportIn, ImportOut, UserOut, UserPatch

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut, summary="Профиль текущего пользователя")
def me(u: CurrentUser):
    return u


@router.patch("/me", response_model=UserOut, summary="Изменить профиль")
def patch_me(body: UserPatch, u: CurrentUser, db: DB):
    data = body.model_dump(exclude_unset=True)
    if "audience" in data and data["audience"] is not None and not db.get(Audience, data["audience"]):
        raise ApiError(422, "validation_error", "Проверьте поля запроса", {"audience": "Неизвестная аудитория"})
    if data.get("share_with_org") and u.organization_id is None:
        raise ApiError(422, "validation_error", "Проверьте поля запроса", {"share_with_org": "Вы не состоите в организации"})
    for k, v in data.items():
        setattr(u, k, v)
    if "share_with_org" in data:
        audit(db, "user.share_with_org", u.id, str(u.id), value=bool(data["share_with_org"]))
    db.commit()
    return u


@router.delete("/me", status_code=204, summary="Удалить аккаунт и все свои данные")
def delete_me(u: CurrentUser, db: DB):
    uid = u.id
    db.execute(delete(TrainingAttempt).where(TrainingAttempt.user_id == uid))
    db.execute(delete(ThreatCheck).where(ThreatCheck.user_id == uid))
    db.delete(u)
    audit(db, "user.deleted", uid, str(uid))
    db.commit()


@router.post("/me/import", response_model=ImportOut, summary="Перенести прогресс из файла экспорта прототипа")
def import_progress(body: ImportIn, u: CurrentUser, db: DB):
    if db.scalar(select(func.count()).select_from(TrainingAttempt).where(TrainingAttempt.user_id == u.id, TrainingAttempt.source == "import")):
        raise ApiError(409, "already_imported", "Прогресс из файла уже перенесён в этот аккаунт")
    scen = {(s.kind, s.slug): s for s in db.scalars(select(Scenario).where(Scenario.is_active))}
    markers = set(db.scalars(select(Marker.slug)))
    rows, why = progress_import.sanitize(body.data, scen, markers)
    total = len(body.data.get("attempts") or []) if isinstance(body.data.get("attempts"), list) else 0
    for r in rows:
        sc = r.pop("scenario")
        db.add(TrainingAttempt(user_id=u.id, scenario_id=sc.id, skill_slug=sc.skill_slug, level=sc.level, legit=sc.honest, source="import", **r))
    audit(db, "user.import", u.id, str(u.id), imported=len(rows), skipped=total - len(rows))
    db.commit()
    return ImportOut(imported=len(rows), skipped=max(0, total - len(rows)), reasons=dict(why))
