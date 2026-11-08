import time

import jwt
from sqlalchemy import select

from app.models import AuditLog, User
from tests.conftest import PASSWORD, login, new_user, register

API = "/api/v1"


def test_health_and_openapi(client):
    r = client.get(API + "/health")
    assert r.status_code == 200 and r.json()["db"] is True and r.json()["ai"] is False
    spec = client.get(API + "/openapi.json").json()
    assert "/api/v1/auth/register" in spec["paths"] and "/api/v1/attempts" in spec["paths"]
    assert client.get(API + "/docs").status_code == 200


def test_register_ok_and_password_not_returned(client, db):
    r = client.post(API + "/auth/register", json={"email": "Anna@Example.org", "password": PASSWORD, "display_name": "  Анна ", "audience": "student"})
    assert r.status_code == 201
    j = r.json()
    assert j["email"] == "anna@example.org" and j["role"] == "learner" and j["display_name"] == "Анна"
    assert "password" not in r.text and "hash" not in r.text
    u = db.scalar(select(User).where(User.email == "anna@example.org"))
    assert u.password_hash.startswith("$2") and PASSWORD not in u.password_hash


def test_register_duplicate_email_case_insensitive(client):
    register(client, "dup@example.org")
    r = client.post(API + "/auth/register", json={"email": "DUP@example.org", "password": PASSWORD})
    assert r.status_code == 409 and r.json()["error"]["code"] == "email_taken"


def test_register_validation_errors(client):
    cases = [({"email": "not-an-email", "password": PASSWORD}, "email"),
             ({"email": "a@example.org", "password": "short"}, "password"),
             ({"email": "a@example.org", "password": "aaaaaaaaaaaa"}, "password"),
             ({"email": "a@example.org", "password": "1234567890"}, "password"),
             ({"email": "petrovich@example.org", "password": "petrovich-2026!"}, "password"),
             ({"email": "a@example.org", "password": "я" * 40}, "password"),
             ({"email": "a@example.org", "password": PASSWORD, "audience": "zzz"}, "audience"),
             ({"email": "a@example.org", "password": PASSWORD, "role": "admin"}, "role")]
    for body, field in cases:
        r = client.post(API + "/auth/register", json=body)
        assert r.status_code == 422, (body, r.text)
        e = r.json()["error"]
        assert e["code"] == "validation_error" and field in e["fields"], (body, e)


def test_cannot_self_assign_role(client, db):
    r = client.post(API + "/auth/register", json={"email": "x@example.org", "password": PASSWORD, "role": "admin"})
    assert r.status_code == 422
    assert db.scalar(select(User).where(User.email == "x@example.org")) is None


def test_login_ok_and_wrong_password_same_message(client):
    email = register(client)
    assert client.post(API + "/auth/login", json={"email": email, "password": PASSWORD}).status_code == 200
    a = client.post(API + "/auth/login", json={"email": email, "password": "wrong-password-1"})
    b = client.post(API + "/auth/login", json={"email": "nobody@example.org", "password": "wrong-password-1"})
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()  # не раскрываем, существует ли email


def test_login_lockout_after_failures(client, db):
    email = register(client)
    for _ in range(5):
        client.post(API + "/auth/login", json={"email": email, "password": "wrong-password-1"})
    r = client.post(API + "/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 423 and r.json()["error"]["code"] == "locked"
    assert db.scalar(select(AuditLog).where(AuditLog.action == "user.locked")) is not None


def test_me_requires_valid_token(client):
    assert client.get(API + "/users/me").status_code == 401
    assert client.get(API + "/users/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    email, h = new_user(client)
    assert client.get(API + "/users/me", headers=h).json()["email"] == email
    # подделанная подпись
    tok = h["Authorization"].split()[1]
    payload = jwt.decode(tok, options={"verify_signature": False})
    forged = jwt.encode(dict(payload, role="admin"), "another-secret-" + "y" * 30, algorithm="HS256")
    assert client.get(API + "/users/me", headers={"Authorization": "Bearer " + forged}).status_code == 401
    # алгоритм none
    none = jwt.encode(payload, None, algorithm="none") if hasattr(jwt, "encode") else ""
    assert client.get(API + "/users/me", headers={"Authorization": "Bearer " + none}).status_code == 401


def test_expired_token_rejected(client):
    import os
    email, h = new_user(client)
    tok = h["Authorization"].split()[1]
    p = jwt.decode(tok, options={"verify_signature": False})
    old = jwt.encode(dict(p, iat=int(time.time()) - 7200, exp=int(time.time()) - 3600), os.environ["IMMUNITY_JWT_SECRET"], algorithm="HS256")
    r = client.get(API + "/users/me", headers={"Authorization": "Bearer " + old})
    assert r.status_code == 401


def test_password_change_revokes_tokens(client):
    email, h = new_user(client)
    r = client.post(API + "/auth/password", headers=h, json={"current_password": PASSWORD, "new_password": "Новый-пароль-2026"})
    assert r.status_code == 204
    assert client.get(API + "/users/me", headers=h).status_code == 401
    assert login(client, email, "Новый-пароль-2026")


def test_logout_all(client):
    _, h = new_user(client)
    assert client.post(API + "/auth/logout-all", headers=h).status_code == 204
    assert client.get(API + "/users/me", headers=h).status_code == 401


def test_patch_me_and_unknown_fields(client):
    _, h = new_user(client)
    r = client.patch(API + "/users/me", headers=h, json={"display_name": "Ира", "audience": "senior"})
    assert r.status_code == 200 and r.json()["audience"] == "senior"
    for bad in ({"role": "admin"}, {"organization_id": 1}, {"audience": "zzz"}, {"share_with_org": True}):
        r = client.patch(API + "/users/me", headers=h, json=bad)
        assert r.status_code == 422, (bad, r.text)
    assert client.get(API + "/users/me", headers=h).json()["role"] == "learner"


def test_delete_me_removes_data(client, db):
    email, h = new_user(client)
    client.post(API + "/attempts", headers=h, json={"kind": "call", "scenario": "bank_safe", "result": "ok", "score": 1})
    assert client.delete(API + "/users/me", headers=h).status_code == 204
    assert db.scalar(select(User).where(User.email == email)) is None
    assert client.post(API + "/auth/login", json={"email": email, "password": PASSWORD}).status_code == 401


def test_error_format_everywhere(client):
    for r in (client.get(API + "/nope"), client.get(API + "/users/me"), client.post(API + "/auth/login", json={})):
        e = r.json()["error"]
        assert set(e) >= {"code", "message"}


def test_body_size_limit(client):
    r = client.post(API + "/auth/login", content=b"{" + b" " * 3_100_000 + b"}", headers={"Content-Type": "application/json"})
    assert r.status_code == 413 and r.json()["error"]["code"] == "payload_too_large"


def test_browser_session_cookie_and_csrf(client):
    email = register(client)
    r = client.post(API + "/auth/session", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200 and "access_token" not in r.text
    sc = r.headers["set-cookie"].lower()
    assert "httponly" in sc and "samesite=strict" in sc and "path=/api" in sc
    assert client.get(API + "/users/me").json()["email"] == email  # cookie работает
    assert client.get(API + "/auth/session").json()["user"]["email"] == email
    body = {"kind": "call", "scenario": "bank_safe", "result": "ok", "score": 1}
    r = client.post(API + "/attempts", json=body)
    assert r.status_code == 403 and r.json()["error"]["code"] == "csrf"
    assert client.post(API + "/attempts", json=body, headers={"X-Immunity-CSRF": "1"}).status_code == 201
    assert client.delete(API + "/auth/session").status_code == 204
    client.cookies.clear()
    assert client.get(API + "/users/me").status_code == 401
    r = client.get(API + "/auth/session")
    assert r.status_code == 200 and r.json() == {"user": None}


def test_cookie_secure_by_default():
    from app.core.config import Settings
    import os
    env = dict(os.environ)
    try:
        os.environ.pop("IMMUNITY_COOKIE_SECURE")
        assert Settings().cookie_secure is True
    finally:
        os.environ.clear(); os.environ.update(env)


def test_settings_reject_weak_secret_and_non_postgres():
    import pytest
    from pydantic import ValidationError
    from app.core.config import Settings
    with pytest.raises(ValidationError):
        Settings(database_url="postgresql+psycopg://x@y/z", jwt_secret="short")
    with pytest.raises(ValidationError):
        Settings(database_url="sqlite:///x.db", jwt_secret="z" * 40)
