import json
import math

from sqlalchemy import select

from app.models import TrainingAttempt
from tests.conftest import new_user

API = "/api/v1"


def test_scenarios_list_and_detail(client):
    r = client.get(API + "/scenarios")
    assert r.status_code == 200
    items = r.json()
    kinds = {i["kind"] for i in items}
    assert kinds == {"call", "chat", "site", "card", "item"} and len(items) == 84
    assert all("honest" not in i for i in items)  # список не раскрывает ответ
    calls = client.get(API + "/scenarios", params={"kind": "call"}).json()
    assert len(calls) == 13 and all(c["has_audio"] for c in calls)
    d = client.get(API + "/scenarios/call/bank_safe").json()
    assert d["lines"] and d["lines"][0]["audio_url"].startswith("/audio/") and d["lines"][0]["audio_url"].endswith(".mp3")
    assert d["content"]["id"] == "bank_safe"
    assert client.get(API + "/scenarios/call/nope").status_code == 404
    assert client.get(API + "/scenarios/zzz/bank_safe").status_code == 422
    stud = client.get(API + "/scenarios", params={"audience": "student"}).json()
    assert stud and all("student" in s["audiences"] for s in stud)


def test_skills_reference(client):
    s = client.get(API + "/skills").json()
    assert [x["slug"] for x in s] == ["calls", "codes", "phishing", "social", "money", "invest"]


def test_attempt_create_derives_skill_from_db(client, db):
    _, h = new_user(client)
    r = client.post(API + "/attempts", headers=h, json={"kind": "call", "scenario": "bank_safe", "result": "bad", "score": 0, "markers": ["code"], "duration_ms": 41000})
    assert r.status_code == 201, r.text
    j = r.json()
    a = db.get(TrainingAttempt, j["id"])
    assert a.skill_slug == j["skill"] and a.level == j["level"] and j["title"]


def test_attempt_validation(client):
    _, h = new_user(client)
    base = {"kind": "call", "scenario": "bank_safe", "result": "ok", "score": 1}
    bad = [dict(base, scenario="nope"), dict(base, kind="zzz"), dict(base, result="maybe"), dict(base, score=1.5), dict(base, score=-0.1),
           dict(base, score="1"), dict(base, markers=["zzz"]), dict(base, markers=["__proto__"]), dict(base, markers=["code"] * 7),
           dict(base, duration_ms=0), dict(base, duration_ms=10 ** 9), dict(base, skill="invest"), dict(base, user_id="x"),
           dict(base, false_positive=True), dict(base, phase="mid")]
    for b in bad:
        r = client.post(API + "/attempts", headers=h, json=b)
        assert r.status_code == 422, (b, r.text)
        assert r.json()["error"]["code"] == "validation_error"
    for raw in ('{"kind":"call","scenario":"bank_safe","result":"ok","score":NaN}', '{"kind":"call","scenario":"bank_safe","result":"ok","score":Infinity}'):
        r = client.post(API + "/attempts", headers={**h, "Content-Type": "application/json"}, content=raw)
        assert r.status_code == 422, raw


def test_attempts_require_auth_and_are_private(client):
    assert client.post(API + "/attempts", json={"kind": "call", "scenario": "bank_safe", "result": "ok", "score": 1}).status_code == 401
    _, a = new_user(client)
    _, b = new_user(client)
    for _ in range(3):
        client.post(API + "/attempts", headers=a, json={"kind": "call", "scenario": "bank_safe", "result": "ok", "score": 1})
    assert client.get(API + "/attempts", headers=a).json()["total"] == 3
    assert client.get(API + "/attempts", headers=b).json()["total"] == 0


def test_history_pagination_and_order(client):
    _, h = new_user(client)
    for i, sc in enumerate(["bank_safe", "boss_voice", "gos_hack"]):
        client.post(API + "/attempts", headers=h, json={"kind": "call", "scenario": sc, "result": "ok", "score": 1})
    p1 = client.get(API + "/attempts", headers=h, params={"limit": 2}).json()
    p2 = client.get(API + "/attempts", headers=h, params={"limit": 2, "offset": 2}).json()
    assert p1["total"] == 3 and len(p1["items"]) == 2 and len(p2["items"]) == 1
    assert p1["items"][0]["scenario"] == "gos_hack"
    assert client.get(API + "/attempts", headers=h, params={"limit": 0}).status_code == 422
    assert client.get(API + "/attempts", headers=h, params={"limit": 500}).status_code == 422


def test_skills_me_index(client):
    _, h = new_user(client)
    s0 = client.get(API + "/skills/me", headers=h).json()
    assert s0["index"] is None and all(x["status"] == "little_data" for x in s0["skills"])
    for sc, res, score in [("bank_safe", "ok", 1), ("gos_hack", "bad", 0), ("boss_voice", "warn", 0.5)]:
        client.post(API + "/attempts", headers=h, json={"kind": "call", "scenario": sc, "result": res, "score": score})
    s = client.get(API + "/skills/me", headers=h).json()
    assert s["index"] and 0 <= s["index"]["value"] <= 100 and s["index"]["coverage"] >= 1
    assert all(math.isfinite(x["mean"]) and 0 <= x["mean"] <= 1 for x in s["skills"])
    assert "не гарантия" in s["note"].lower()


def test_skill_model_matches_prototype_formula():
    from datetime import UTC, datetime
    from app.domain.skills import Evidence, estimate, overall
    now = datetime(2026, 11, 8, tzinfo=UTC)
    ev = [Evidence("call", "bank_safe", "codes", 2, 1.0, now), Evidence("call", "bank_safe", "codes", 2, 0.0, now)]
    st = estimate(ev, ["codes", "calls"], now)
    # первая попытка вес 1, повтор того же сценария — 0.5: a = 2 + 1, b = 2 + 0.5
    assert abs(st["codes"].a - 3.0) < 1e-9 and abs(st["codes"].b - 2.5) < 1e-9 and st["calls"].n == 0
    o = overall(st)
    assert o == {"value": round(3 / 5.5 * 100), "pm": o["pm"], "coverage": 1}


def _export(attempts):
    return {"app": "immunitet", "v": 2, "exported": "2026-11-08T10:00:00Z", "data": {"attempts": attempts}}


def test_import_prototype_progress(client, db):
    _, h = new_user(client)
    now = 1762590000000
    data = _export([{"k": "call", "id": "bank_safe", "sk": "codes", "s": 1, "res": "ok", "ts": now},
                    {"k": "chat", "id": "job_drop", "sk": "money", "s": 0, "res": "bad", "ts": now, "mk": ["code", "zzz", "__proto__"]},
                    {"k": "call", "id": "nope", "s": 1}, {"k": "__proto__", "id": "bank_safe", "s": 1}, {"k": "call", "id": "constructor", "s": 1},
                    {"k": "call", "id": "bank_safe", "s": "1"}, {"k": "call", "id": "bank_safe", "s": 1, "res": "constructor", "ts": "abc"}, 5, None])
    r = client.post(API + "/users/me/import", headers=h, json=data)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["imported"] == 3 and j["skipped"] == 6 and j["reasons"]["unknown_scenario"] >= 1
    rows = client.get(API + "/attempts", headers=h).json()["items"]
    assert {x["result"] for x in rows} <= {"ok", "warn", "bad"} and all(x["source"] == "import" for x in rows)
    drop = next(x for x in rows if x["scenario"] == "job_drop")
    assert drop["markers"] == ["code"] and drop["skill"] != "zzz"
    assert client.post(API + "/users/me/import", headers=h, json=data).status_code == 409


def test_import_rejects_wrong_format(client):
    _, h = new_user(client)
    for body in ({"app": "other", "v": 2, "data": {}}, {"app": "immunitet", "v": 3, "data": {}}, {"app": "immunitet", "v": 2, "data": []},
                 {"app": "immunitet", "v": 2, "data": {}, "extra": 1}):
        assert client.post(API + "/users/me/import", headers=h, json=body).status_code == 422, body
    big = _export([{"k": "call", "id": "bank_safe", "s": 1}] * 5000)
    r = client.post(API + "/users/me/import", headers=h, json=big)
    assert r.status_code == 200 and r.json()["imported"] == 800
    assert len(json.dumps(big)) < 3_000_000


def test_guides_have_sources_and_checked_dates(client):
    g = client.get(API + "/guides").json()
    assert len(g["emergency"]) == 6 and g["laws"] and g["protection"]
    assert not any("10 рабочих дней" in x["text"] for x in g["emergency"] + g["laws"])
    for law in g["laws"]:
        assert law["sources"] and all(s in g["sources"] for s in law["sources"])
        assert all(g["sources"][s]["checked"] for s in law["sources"])


def test_import_items_with_uppercase_ids(client):
    _, h = new_user(client)
    r = client.post(API + "/users/me/import", headers=h, json=_export([{"k": "item", "id": "A1", "s": 1, "res": "ok", "ph": "pre"}]))
    assert r.json()["imported"] == 1
    assert client.get(API + "/attempts", headers=h).json()["items"][0]["phase"] == "pre"


def test_card_answers_not_in_list_but_honest_flag_stored(client, db):
    from app.models import Scenario
    cards = client.get(API + "/scenarios", params={"kind": "card"}).json()
    assert len(cards) == 26
    honest = db.scalars(select(Scenario).where(Scenario.kind == "card", Scenario.honest)).all()
    assert 0 < len(honest) < 26
