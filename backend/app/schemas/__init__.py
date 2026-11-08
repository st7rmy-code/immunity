"""Схемы запросов и ответов API. Входные схемы запрещают неизвестные поля (extra='forbid')."""
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

Kind = Literal["call", "chat", "site", "card", "item"]
Result = Literal["ok", "warn", "bad"]
Role = Literal["learner", "teacher", "org_admin", "admin"]
RiskLevel = Literal["unknown", "low", "medium", "high", "critical"]
Tier = Literal["weak", "medium", "strong", "critical"]
Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9_]{1,48}$")]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]


class In(BaseModel):
    # strict: строка «1» вместо числа 1 и «true» вместо true — ошибка, а не тихое приведение
    model_config = ConfigDict(extra="forbid", strict=True)


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- авторизация и профиль ---
class RegisterIn(In):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)
    display_name: Name | None = None
    audience: Slug | None = None


class LoginIn(In):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class UserOut(Out):
    id: uuid.UUID
    email: str
    display_name: str | None
    role: Role
    audience: str | None
    organization_id: int | None
    share_with_org: bool
    created_at: datetime


class UserPatch(In):
    display_name: Name | None = None
    audience: Slug | None = None
    share_with_org: bool | None = None


class PasswordChangeIn(In):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=1, max_length=200)


# --- контент ---
class SkillRef(Out):
    slug: str
    title: str
    description: str


class ScenarioBrief(BaseModel):
    kind: Kind
    slug: str
    title: str
    skill: str
    level: int
    audiences: list[str]
    has_audio: bool


class ScenarioLineOut(BaseModel):
    position: int
    text: str
    speaker: str
    audio_url: str | None
    duration_s: float | None


class ScenarioDetail(ScenarioBrief):
    markers: list[str]
    content: dict
    lines: list[ScenarioLineOut]


class Page[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int


# --- тренировки ---
class AttemptIn(In):
    kind: Kind
    scenario: Slug
    result: Result
    score: float = Field(ge=0, le=1, allow_inf_nan=False)
    markers: list[Slug] = Field(default_factory=list, max_length=6)
    duration_ms: int | None = Field(None, gt=0, lt=3_600_000)
    phase: Literal["pre", "post"] | None = None
    false_positive: bool = False


class AttemptOut(BaseModel):
    id: int
    kind: Kind
    scenario: str
    title: str
    skill: str
    level: int
    result: Result
    score: float
    markers: list[str]
    duration_ms: int | None
    phase: str | None
    legit: bool
    false_positive: bool
    source: str
    created_at: datetime


class ImportIn(In):
    """Файл экспорта прототипа (формат immunitet v2). Поле data проверяется отдельно, как в Store.sanitize()."""
    app: Literal["immunitet"]
    v: Literal[2]
    exported: str | None = Field(None, max_length=40)
    data: dict


class ImportOut(BaseModel):
    imported: int
    skipped: int
    reasons: dict[str, int]


class SkillState(BaseModel):
    skill: str
    title: str
    mean: float = Field(description="Оценка навыка 0…1 (бета-апостериорное среднее)")
    sd: float
    evidence: float = Field(description="Вес свидетельств с учётом новизны и давности")
    attempts: int
    status: Literal["little_data", "weak", "medium", "strong"]


class IndexOut(BaseModel):
    value: int = Field(ge=0, le=100)
    pm: int
    coverage: int


class SkillsOut(BaseModel):
    skills: list[SkillState]
    index: IndexOut | None
    note: str


# --- проверка угроз ---
class ThreatCheckIn(In):
    kind: Literal["msg", "url", "mail"]
    text: str = Field("", max_length=10_000)
    url: str | None = Field(None, max_length=2048)
    sender: str | None = Field(None, max_length=320)
    subject: str | None = Field(None, max_length=300)


class Indicator(BaseModel):
    id: str
    tier: Tier
    title: str
    quote: str
    explanation: str


class ThreatCheckOut(BaseModel):
    risk_level: RiskLevel
    confidence: None = Field(None, description="Для правил процент уверенности не считается: он не откалиброван")
    strength: str
    detected_indicators: list[Indicator]
    explanation: str
    limitations: list[str]
    recommended_actions: list[str]
    avoid_actions: list[str]
    engine: str
    stored: bool


# --- организации ---
class OrgIn(In):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=200)]
    kind: Literal["school", "university", "bank", "company", "public", "other"] = "other"


class OrgOut(Out):
    id: int
    name: str
    kind: str
    created_at: datetime


class MemberIn(In):
    email: EmailStr
    role: Literal["learner", "teacher", "org_admin"] = "learner"


class MemberOut(BaseModel):
    user_id: uuid.UUID
    role: Role
    organization_id: int


class OrgSkill(BaseModel):
    skill: str
    title: str
    mean: float
    learners: int


class OrgSummary(BaseModel):
    organization: OrgOut
    members_total: int
    members_sharing: int
    min_group: int
    enough_data: bool
    skills: list[OrgSkill]
    attempts_30d: int | None
    note: str


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    db: bool
    ai: bool = Field(False, description="AI Gateway не подключён: ИИ-функции на сервере недоступны")
    version: str

    @field_validator("version")
    @classmethod
    def _v(cls, v: str) -> str:
        return v[:20]
