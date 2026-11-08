"""Оценка навыков по попыткам (перенос Evidence.skills из прототипа).

Модель: для каждого навыка — бета-распределение с априорным Beta(2, 2). Каждая попытка добавляет
вес w·score «успехов» и w·(1−score) «неудач». Вес зависит от типа задания, сложности, новизны
(повтор того же сценария весит меньше) и давности (полураспад 90 дней).
Индекс — среднее по навыкам, где набралось хоть немного свидетельств. Это учебная оценка, не гарантия.
"""
import math
from dataclasses import dataclass
from datetime import UTC, datetime

W = {"item": 1.0, "call": 1.0, "chat": 1.0, "site": 1.0, "card": 0.35}
L = {1: 0.8, 2: 1.0, 3: 1.25}
NOV = [1.0, 0.5, 0.25, 0.15, 0.1]
HALF_DAYS = 90.0


@dataclass(frozen=True)
class Evidence:
    kind: str
    scenario: str
    skill: str
    level: int
    score: float
    at: datetime


@dataclass
class State:
    a: float = 2.0
    b: float = 2.0
    n: float = 0.0
    cnt: int = 0

    @property
    def mean(self) -> float:
        return self.a / (self.a + self.b)

    @property
    def sd(self) -> float:
        m, t = self.mean, self.a + self.b
        return math.sqrt(m * (1 - m) / (t + 1))


def js_round(x: float) -> int:
    """Округление как Math.round в прототипе (половина — вверх)."""
    return math.floor(x + 0.5)


def estimate(attempts: list[Evidence], skills: list[str], now: datetime | None = None) -> dict[str, State]:
    now = now or datetime.now(UTC)
    out = {s: State() for s in skills}
    seen: dict[tuple[str, str], int] = {}
    for a in sorted(attempts, key=lambda x: x.at):
        st = out.get(a.skill)
        if st is None:
            continue
        key = (a.kind, a.scenario)
        k = seen[key] = seen.get(key, 0) + 1
        age_days = max(0.0, (now - a.at).total_seconds()) / 86400
        w = W.get(a.kind, 1.0) * L.get(a.level, 1.0) * NOV[min(k - 1, len(NOV) - 1)] * 0.5 ** (age_days / HALF_DAYS)
        s = min(1.0, max(0.0, float(a.score)))
        st.a += w * s
        st.b += w * (1 - s)
        st.n += w
        st.cnt += 1
    return out


def overall(states: dict[str, State]) -> dict | None:
    xs = [s for s in states.values() if s.n >= 0.5]
    if not xs:
        return None
    m = sum(s.mean for s in xs) / len(xs)
    sd = math.sqrt(sum(s.sd ** 2 for s in xs)) / len(xs)
    return {"value": js_round(m * 100), "pm": max(1, js_round(sd * 100)), "coverage": len(xs)}


def status(st: State) -> str:
    if st.n < 1:
        return "little_data"
    if st.mean < 0.55:
        return "weak"
    if st.mean < 0.75:
        return "medium"
    return "strong"
