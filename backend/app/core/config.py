"""Настройки только из переменных окружения (префикс IMMUNITY_). Секретов по умолчанию нет."""
from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="IMMUNITY_", env_file=".env", extra="ignore")

    env: Literal["dev", "test", "prod"] = "dev"
    database_url: str
    jwt_secret: SecretStr
    jwt_ttl_minutes: int = Field(60, ge=5, le=1440)
    bcrypt_rounds: int = Field(12, ge=4, le=15)
    cors_origins: list[str] = []
    audio_base_url: str = "/audio/"
    login_max_failures: int = Field(5, ge=3, le=20)
    login_lock_minutes: int = Field(15, ge=1, le=1440)
    max_body_bytes: int = 3_000_000
    cookie_name: str = "immunity_session"
    cookie_secure: bool = True  # в dev на http://localhost браузеры тоже принимают Secure-cookie
    org_min_group: int = Field(5, ge=2, le=50)  # меньше людей — сводку организации не показываем

    @field_validator("jwt_secret")
    @classmethod
    def _secret_len(cls, v: SecretStr) -> SecretStr:
        if len(v.get_secret_value()) < 32:
            raise ValueError("IMMUNITY_JWT_SECRET должен быть не короче 32 символов")
        return v

    @field_validator("database_url")
    @classmethod
    def _pg_only(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("Поддерживается только PostgreSQL (postgresql+psycopg://…)")
        return v


@lru_cache
def get_settings() -> Settings:
    s = Settings()  # type: ignore[call-arg]
    if s.env == "prod" and s.bcrypt_rounds < 12:
        raise ValueError("В prod IMMUNITY_BCRYPT_ROUNDS не меньше 12")
    return s
