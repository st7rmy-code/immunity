import json
from pathlib import Path

import pytest
from sqlalchemy import inspect, select

from app.core.db import get_engine
from app.domain import detective as d
from app.models import ThreatCheck
from tests.conftest import new_user

API = "/api/v1"
PARITY = json.loads((Path(__file__).parent / "fixtures" / "rules_parity.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", PARITY, ids=[str(i) for i in range(len(PARITY))])
def test_parity_with_prototype(case):
    i = case["input"]
    r = d.check(i["kind"], text=i.get("text", ""), url=i.get("url"), sender=i.get("from"), subject=i.get("subject"))
    assert r["risk_level"] == case["risk_level"]
    assert sorted(h["id"] + ":" + h["tier"] for h in r["detected_indicators"]) == case["indicators"]


@pytest.mark.parametrize("text,level", [
    ("Продиктуйте код из СМС", "critical"), ("Переведите деньги на безопасный счёт", "critical"), ("Установите AnyDesk", "critical"),
    ("Курьер заберёт наличные", "critical"), ("Перезвони мне, пожалуйста", "unknown"),
])
def test_minimal_cases(text, level):
    assert d.check("msg", text=text)["risk_level"] == level


def test_js_regex_semantics():
    assert d.js_re(r"\d+$", "").fullmatch("١٢") is None  # арабские цифры \d в JS не ловит
    assert d.js_re(r"\w+", "").fullmatch("слово") is None
    assert d.js_re(r"abc$", "").search("abc\n") is None  # $ в JS — строго конец строки


def test_url_parser_edge_cases():
    ids = lambda u: {h["id"] for h in d.url_rules(u)}  # noqa: E731
    assert "url_ip" in ids("http://[2001:db8::1]/") and "url_ip" in ids("http://192.168.0.1/")
    assert "url_port" in ids("https://bank.ru:8443/") and "url_port" not in ids("https://bank.ru:443/")
    assert "url_bad" in ids("http://bank.ru:99999/")
    puny = "xn--" + "gоsuslugi".encode("punycode").decode() + ".ru"
    assert "url_mix" in ids("https://gоsuslugi.ru") and "url_mix" in ids("https://" + puny)
    assert ids("https://госуслуги.рф/") == set()


def test_api_threat_check_anonymous_not_stored(client, db):
    r = client.post(API + "/threat-checks", json={"kind": "msg", "text": "Продиктуйте код из СМС"})
    assert r.status_code == 200
    j = r.json()
    assert j["risk_level"] == "critical" and j["confidence"] is None and j["stored"] is False and j["engine"] == "rules-v2"
    assert db.scalar(select(ThreatCheck)) is None


def test_api_threat_check_stores_no_text(client, db):
    _, h = new_user(client)
    secret = "Продиктуйте код из СМС, моя карта 2200 1234 5678 9012"
    r = client.post(API + "/threat-checks", headers=h, json={"kind": "msg", "text": secret})
    assert r.json()["stored"] is True
    row = db.scalar(select(ThreatCheck))
    assert row.risk_level == "critical" and row.input_length == len(secret) and "codes" in row.indicator_ids
    cols = {c["name"] for c in inspect(get_engine()).get_columns("threat_checks")}
    assert not cols & {"text", "body", "url", "content", "input"}  # колонок для исходного текста нет
    with get_engine().connect() as c:
        dump = str(c.exec_driver_sql("select * from threat_checks").fetchall())
    assert "5678" not in dump and "Продиктуйте" not in dump


def test_api_threat_check_validation(client):
    for body in ({"kind": "msg", "text": ""}, {"kind": "url"}, {"kind": "zzz", "text": "x"}, {"kind": "msg", "text": "a" * 10001},
                 {"kind": "msg", "text": "x", "model": "gpt"}):
        r = client.post(API + "/threat-checks", json=body)
        assert r.status_code == 422, body


def test_api_url_and_mail(client):
    r = client.post(API + "/threat-checks", json={"kind": "url", "url": "https://user:pass@bank.ru/login"}).json()
    assert r["risk_level"] == "critical" and any("DNS" in x for x in r["limitations"])
    m = client.post(API + "/threat-checks", json={"kind": "mail", "sender": "noreply@delivery-info.top", "subject": "Акт", "text": "Откройте вложение akt.exe"}).json()
    assert m["risk_level"] == "critical"
