from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DB, CurrentUser, audit
from app.core.config import get_settings
from app.core.errors import ApiError
from app.core.security import create_token, hash_password, password_problem, verify_password
from app.models import Audience, User
from app.schemas import LoginIn, PasswordChangeIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED, summary="Регистрация")
def register(body: RegisterIn, db: DB):
    email = body.email.lower()
    if p := password_problem(body.password, email):
        raise ApiError(422, "validation_error", "Проверьте поля запроса", {"password": p})
    if body.audience and not db.get(Audience, body.audience):
        raise ApiError(422, "validation_error", "Проверьте поля запроса", {"audience": "Неизвестная аудитория"})
    if db.scalar(select(User.id).where(User.email == email)):
        raise ApiError(409, "email_taken", "Этот email уже зарегистрирован")
    u = User(email=email, password_hash=hash_password(body.password), display_name=body.display_name, audience=body.audience, role="learner")
    db.add(u)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ApiError(409, "email_taken", "Этот email уже зарегистрирован")
    audit(db, "user.register", u.id, str(u.id))
    db.commit()
    return u


def _authenticate(body: LoginIn, db) -> User:
    s = get_settings()
    u = db.scalar(select(User).where(User.email == body.email.lower()))
    now = datetime.now(UTC)
    if u and u.locked_until and u.locked_until > now:
        verify_password(body.password, None)
        raise ApiError(423, "locked", f"Слишком много неудачных попыток. Попробуйте через {s.login_lock_minutes} мин.")
    if not verify_password(body.password, u.password_hash if u else None) or not u or not u.is_active:
        if u:
            u.failed_logins += 1
            if u.failed_logins >= s.login_max_failures:
                u.locked_until, u.failed_logins = now + timedelta(minutes=s.login_lock_minutes), 0
                audit(db, "user.locked", u.id, str(u.id))
            audit(db, "user.login_failed", u.id, str(u.id))
            db.commit()
        raise ApiError(401, "invalid_credentials", "Неверный email или пароль")
    u.failed_logins, u.locked_until, u.last_login_at = 0, None, now
    audit(db, "user.login", u.id, str(u.id))
    db.commit()
    return u


@router.post("/login", response_model=TokenOut, summary="Вход для API-клиентов: токен в ответе")
def login(body: LoginIn, db: DB):
    u = _authenticate(body, db)
    token, ttl = create_token(u.id, u.role, u.token_version)
    return TokenOut(access_token=token, expires_in=ttl)


@router.post("/session", response_model=UserOut, summary="Вход для браузера: токен в httpOnly-cookie",
             description="JavaScript страницы токен не видит. Изменяющие запросы с cookie требуют заголовок X-Immunity-CSRF: 1.")
def session_login(body: LoginIn, db: DB, response: Response):
    u = _authenticate(body, db)
    token, ttl = create_token(u.id, u.role, u.token_version)
    s = get_settings()
    response.set_cookie(s.cookie_name, token, max_age=ttl, httponly=True, secure=s.cookie_secure, samesite="strict", path="/api")
    return u


@router.delete("/session", status_code=204, summary="Выйти в этом браузере")
def session_logout(response: Response):
    s = get_settings()
    response.delete_cookie(s.cookie_name, path="/api", httponly=True, secure=s.cookie_secure, samesite="strict")


@router.post("/password", status_code=204, summary="Смена пароля (все старые токены перестают действовать)")
def change_password(body: PasswordChangeIn, u: CurrentUser, db: DB):
    if not verify_password(body.current_password, u.password_hash):
        raise ApiError(401, "invalid_credentials", "Текущий пароль неверный")
    if p := password_problem(body.new_password, u.email):
        raise ApiError(422, "validation_error", "Проверьте поля запроса", {"new_password": p})
    u.password_hash, u.token_version = hash_password(body.new_password), u.token_version + 1
    audit(db, "user.password_changed", u.id, str(u.id))
    db.commit()


@router.post("/logout-all", status_code=204, summary="Выйти на всех устройствах")
def logout_all(u: CurrentUser, db: DB):
    u.token_version += 1
    audit(db, "user.logout_all", u.id, str(u.id))
    db.commit()
