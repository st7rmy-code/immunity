"""Перенос прогресса из файла экспорта прототипа (immunitet v2) в аккаунт.

Те же правила, что Store.sanitize() в прототипе: только собственные ключи, известные сценарии и маркеры,
конечные числа в допустимых диапазонах, разумные даты, ограничение объёма. Навык и сложность берутся
из сценария в базе, а не из файла.
"""
from collections import Counter
from datetime import UTC, datetime, timedelta

MAX_ATTEMPTS = 800
TS_MIN = datetime(2024, 1, 1, tzinfo=UTC)
RES = {"ok", "warn", "bad"}
KINDS = {"call", "chat", "site", "card", "item"}


def _ts(v) -> datetime | None:
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    try:
        d = datetime.fromtimestamp(float(v) / 1000, tz=UTC)
    except (OverflowError, OSError, ValueError):
        return None
    return d if TS_MIN <= d <= datetime.now(UTC) + timedelta(days=1) else None


def sanitize(data: dict, scenarios: dict[tuple[str, str], object], markers: set[str]) -> tuple[list[dict], Counter]:
    """Возвращает список чистых попыток и счётчик причин отказа."""
    why: Counter = Counter()
    raw = data.get("attempts") if isinstance(data, dict) else None
    if not isinstance(raw, list):
        return [], why
    if len(raw) > MAX_ATTEMPTS * 3:
        why["too_many"] += len(raw) - MAX_ATTEMPTS * 3
        raw = raw[-MAX_ATTEMPTS * 3:]
    out = []
    for a in raw:
        if not isinstance(a, dict):
            why["not_object"] += 1
            continue
        k, sid, s = a.get("k"), a.get("id"), a.get("s")
        if k not in KINDS or not isinstance(sid, str) or len(sid) > 48:
            why["unknown_kind_or_id"] += 1
            continue
        sc = scenarios.get((k, sid.lower() if k == "item" else sid))
        if sc is None:
            why["unknown_scenario"] += 1
            continue
        if isinstance(s, bool) or not isinstance(s, (int, float)) or s != s or s in (float("inf"), float("-inf")):
            why["bad_score"] += 1
            continue
        s = min(1.0, max(0.0, float(s)))
        res = a.get("res") if a.get("res") in RES else ("ok" if s >= 0.75 else "warn" if s >= 0.4 else "bad")
        mk = [m for m in (a.get("mk") or []) if isinstance(m, str) and m in markers][:6] if isinstance(a.get("mk"), list) else []
        ms = a.get("ms")
        dur = int(ms) if isinstance(ms, (int, float)) and not isinstance(ms, bool) and 0 < ms < 3_600_000 else None
        out.append({"scenario": sc, "result": res, "score": round(s, 3), "markers": mk, "duration_ms": dur,
                    "phase": a.get("ph") if a.get("ph") in ("pre", "post") else None,
                    "false_positive": a.get("fp") is True, "created_at": _ts(a.get("ts")) or datetime.now(UTC)})
    if len(out) > MAX_ATTEMPTS:
        why["over_limit"] += len(out) - MAX_ATTEMPTS
        out = out[-MAX_ATTEMPTS:]
    return out, why
