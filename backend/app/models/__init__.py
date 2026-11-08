"""Модели данных. Все пользовательские данные привязаны к users.id — доступ проверяется в API по владельцу и роли."""
import uuid
from datetime import UTC, datetime

from sqlalchemy import (BigInteger, Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, Numeric,
                        SmallInteger, String, Text, UniqueConstraint, func)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

ROLES = ("learner", "teacher", "org_admin", "admin")
KINDS = ("call", "chat", "site", "card", "item")
RESULTS = ("ok", "warn", "bad")
RISK_LEVELS = ("unknown", "low", "medium", "high", "critical")
CHECK_KINDS = ("msg", "url", "mail")
ORG_KINDS = ("school", "university", "bank", "company", "public", "other")


def now_utc() -> datetime:
    return datetime.now(UTC)


def _in(col: str, values: tuple[str, ...]) -> str:
    return f"{col} IN ({', '.join(repr(v) for v in values)})"


class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = (CheckConstraint(_in("kind", ORG_KINDS), name="kind"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(20), default="other")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint(_in("role", ROLES), name="role"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True)  # хранится в нижнем регистре
    password_hash: Mapped[str] = mapped_column(String(100))
    display_name: Mapped[str | None] = mapped_column(String(80))
    role: Mapped[str] = mapped_column(String(20), default="learner")
    audience: Mapped[str | None] = mapped_column(String(20), ForeignKey("audiences.slug"))
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id", ondelete="SET NULL"), index=True)
    share_with_org: Mapped[bool] = mapped_column(Boolean, default=False)  # согласие на обезличенную сводку для организации
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    token_version: Mapped[int] = mapped_column(Integer, default=0)  # +1 → все выданные токены недействительны
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    organization: Mapped[Organization | None] = relationship()


class Audience(Base):
    __tablename__ = "audiences"
    slug: Mapped[str] = mapped_column(String(20), primary_key=True)
    title: Mapped[str] = mapped_column(String(80))
    hint: Mapped[str] = mapped_column(String(200), default="")


class Skill(Base):
    __tablename__ = "skills"
    slug: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(400), default="")
    position: Mapped[int] = mapped_column(SmallInteger, default=0)


class Marker(Base):
    __tablename__ = "markers"
    slug: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))


class Scenario(Base):
    __tablename__ = "scenarios"
    __table_args__ = (UniqueConstraint("kind", "slug", name="kind_slug"), CheckConstraint(_in("kind", KINDS), name="kind"),
                      CheckConstraint("level BETWEEN 1 AND 3", name="level"))
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(8))
    slug: Mapped[str] = mapped_column(String(48))
    title: Mapped[str] = mapped_column(String(240))
    skill_slug: Mapped[str] = mapped_column(ForeignKey("skills.slug"), index=True)
    level: Mapped[int] = mapped_column(SmallInteger, default=1)
    honest: Mapped[bool] = mapped_column(Boolean, default=False)
    audiences: Mapped[list[str]] = mapped_column(ARRAY(String(20)), default=list)
    markers: Mapped[list[str]] = mapped_column(ARRAY(String(32)), default=list)
    content: Mapped[dict] = mapped_column(JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=now_utc)
    lines: Mapped[list["ScenarioLine"]] = relationship(order_by="ScenarioLine.position", cascade="all, delete-orphan")
    skill: Mapped[Skill] = relationship()


class ScenarioLine(Base):
    """Озвученные реплики звонков: текст и путь к MP3 (сами файлы — статика, не в БД)."""
    __tablename__ = "scenario_lines"
    __table_args__ = (UniqueConstraint("scenario_id", "position", name="scenario_position"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(SmallInteger)
    text: Mapped[str] = mapped_column(Text)
    speaker: Mapped[str] = mapped_column(String(20))
    audio_path: Mapped[str | None] = mapped_column(String(120))
    duration_s: Mapped[float | None] = mapped_column(Float)


class TrainingAttempt(Base):
    __tablename__ = "training_attempts"
    __table_args__ = (CheckConstraint(_in("result", RESULTS), name="result"), CheckConstraint("score >= 0 AND score <= 1", name="score"),
                      CheckConstraint("duration_ms IS NULL OR (duration_ms > 0 AND duration_ms < 3600000)", name="duration"),
                      CheckConstraint("phase IS NULL OR phase IN ('pre', 'post')", name="phase"),
                      Index("ix_attempts_user_created", "user_id", "created_at"))
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    scenario_id: Mapped[int] = mapped_column(ForeignKey("scenarios.id"))
    skill_slug: Mapped[str] = mapped_column(ForeignKey("skills.slug"))
    level: Mapped[int] = mapped_column(SmallInteger)
    result: Mapped[str] = mapped_column(String(4))
    score: Mapped[float] = mapped_column(Numeric(4, 3, asdecimal=False))
    markers: Mapped[list[str]] = mapped_column(ARRAY(String(32)), default=list)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    phase: Mapped[str | None] = mapped_column(String(4))
    legit: Mapped[bool] = mapped_column(Boolean, default=False)
    false_positive: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(10), default="app")  # app | import
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    scenario: Mapped[Scenario] = relationship()


class ThreatCheck(Base):
    """Факт проверки без исходного текста: только уровень, коды признаков и длина."""
    __tablename__ = "threat_checks"
    __table_args__ = (CheckConstraint(_in("kind", CHECK_KINDS), name="kind"), CheckConstraint(_in("risk_level", RISK_LEVELS), name="risk_level"))
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(4))
    risk_level: Mapped[str] = mapped_column(String(8))
    indicator_ids: Mapped[list[str]] = mapped_column(ARRAY(String(32)), default=list)
    input_length: Mapped[int] = mapped_column(Integer)
    engine: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)  # без FK: журнал переживает удаление
    action: Mapped[str] = mapped_column(String(40), index=True)
    target: Mapped[str | None] = mapped_column(String(120))
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
