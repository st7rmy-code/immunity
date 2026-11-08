import uuid
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import ApiError
from app.core.security import decode_token
from app.models import AuditLog, User

bearer = HTTPBearer(auto_error=False, description="Токен из POST /api/v1/auth/login")
DB = Annotated[Session, Depends(get_db)]


CSRF_HEADER = "X-Immunity-CSRF"
SAFE = {"GET", "HEAD", "OPTIONS"}


def _token(request: Request, cred: HTTPAuthorizationCredentials | None) -> str | None:
    """Токен из заголовка Authorization (API-клиенты) или из httpOnly-cookie (браузер).
    Для cookie на изменяющих запросах нужен заголовок X-Immunity-CSRF: чужой сайт не может его поставить без CORS."""
    if cred is not None and cred.scheme.lower() == "bearer":
        return cred.credentials
    tok = request.cookies.get(get_settings().cookie_name)
    if tok and request.method not in SAFE and request.headers.get(CSRF_HEADER) != "1":
        raise ApiError(403, "csrf", "Запрос отклонён: нет заголовка " + CSRF_HEADER)
    return tok


def _user_from(token: str | None, db: Session) -> User | None:
    if not token:
        return None
    p = decode_token(token)
    if not p:
        return None
    try:
        uid = uuid.UUID(p["sub"])
    except (ValueError, TypeError):
        return None
    u = db.get(User, uid)
    if not u or not u.is_active or u.token_version != p.get("tv"):
        return None
    return u


def current_user(request: Request, db: DB, cred: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> User:
    u = _user_from(_token(request, cred), db)
    if u is None:
        raise ApiError(401, "unauthorized", "Нужно войти в аккаунт", headers={"WWW-Authenticate": "Bearer"})
    return u


def optional_user(request: Request, db: DB, cred: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> User | None:
    return _user_from(_token(request, cred), db)


CurrentUser = Annotated[User, Depends(current_user)]
OptionalUser = Annotated[User | None, Depends(optional_user)]


def require(*roles: str):
    def dep(u: CurrentUser) -> User:
        if u.role not in roles:
            raise ApiError(403, "forbidden", "Недостаточно прав")
        return u
    return dep


def audit(db: Session, action: str, actor: uuid.UUID | None = None, target: str | None = None, **details) -> None:
    db.add(AuditLog(action=action, actor_id=actor, target=target, details=details))
