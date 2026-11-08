from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DB
from app.api.v1 import auth, checks, content, orgs, training, users
from app.schemas import Health

VERSION = "0.1.0"
router = APIRouter(prefix="/api/v1")
for r in (auth.router, users.router, content.router, training.router, checks.router, orgs.router):
    router.include_router(r)


@router.get("/health", response_model=Health, tags=["system"], summary="Состояние сервиса")
def health(db: DB):
    try:
        db.execute(text("select 1"))
        ok = True
    except Exception:  # noqa: BLE001
        ok = False
    return Health(status="ok" if ok else "degraded", db=ok, ai=False, version=VERSION)
