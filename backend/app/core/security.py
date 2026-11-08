"""Пароли (bcrypt) и токены доступа (JWT HS256)."""
import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import get_settings

ALG = "HS256"
COMMON = {"1234567890", "qwertyuiop", "password12", "йцукенгшщз", "0987654321", "1111111111", "qwerty1234", "1q2w3e4r5t", "password123", "пароль1234"}


def password_problem(pw: str, email: str = "") -> str | None:
    """Проверка пароля. Возвращает текст ошибки или None."""
    if len(pw) < 10:
        return "Пароль — не короче 10 символов"
    if len(pw.encode("utf-8")) > 72:
        return "Пароль — не длиннее 72 байт (около 36 русских букв)"
    if len(set(pw)) < 4:
        return "Пароль слишком простой: мало разных символов"
    if pw.lower() in COMMON:
        return "Этот пароль слишком распространён"
    local = email.split("@")[0].lower()
    if local and len(local) >= 4 and local in pw.lower():
        return "Пароль не должен содержать имя почты"
    return None


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt(rounds=get_settings().bcrypt_rounds)).decode("ascii")


# хеш-пустышка: проверка пароля для несуществующего email занимает столько же времени
_DUMMY = None


def verify_password(pw: str, hashed: str | None) -> bool:
    global _DUMMY
    if hashed is None:
        if _DUMMY is None:
            _DUMMY = hash_password("dummy-password-for-timing")
        bcrypt.checkpw(pw.encode("utf-8")[:72], _DUMMY.encode("ascii"))
        return False
    try:
        return bcrypt.checkpw(pw.encode("utf-8")[:72], hashed.encode("ascii"))
    except ValueError:
        return False


def create_token(user_id: uuid.UUID, role: str, token_version: int) -> tuple[str, int]:
    s = get_settings()
    now = datetime.now(UTC)
    ttl = s.jwt_ttl_minutes * 60
    payload = {"sub": str(user_id), "role": role, "tv": token_version, "typ": "access",
               "iat": int(now.timestamp()), "exp": int((now + timedelta(seconds=ttl)).timestamp()), "jti": uuid.uuid4().hex}
    return jwt.encode(payload, s.jwt_secret.get_secret_value(), algorithm=ALG), ttl


def decode_token(token: str) -> dict | None:
    try:
        p = jwt.decode(token, get_settings().jwt_secret.get_secret_value(), algorithms=[ALG],
                       options={"require": ["exp", "iat", "sub"]})
    except jwt.PyJWTError:
        return None
    if p.get("typ") != "access":
        return None
    return p
