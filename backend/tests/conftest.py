"""Тесты работают с настоящей PostgreSQL: схема создаётся миграциями Alembic, контент — загрузчиком seed.

База задаётся IMMUNITY_TEST_DATABASE_URL (по умолчанию локальная immunity_test). Тесты очищают её полностью.
"""
import os
import uuid

import pytest

os.environ["IMMUNITY_ENV"] = "test"
os.environ["IMMUNITY_DATABASE_URL"] = os.environ.get("IMMUNITY_TEST_DATABASE_URL", "postgresql+psycopg://immunity:immunity_dev@127.0.0.1:55432/immunity_test")
os.environ["IMMUNITY_JWT_SECRET"] = "test-secret-" + "x" * 40
os.environ["IMMUNITY_BCRYPT_ROUNDS"] = "4"
os.environ["IMMUNITY_COOKIE_SECURE"] = "false"  # TestClient ходит по http; флаг Secure проверяется отдельно
os.environ.pop("IMMUNITY_CORS_ORIGINS", None)

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.db import get_engine, get_sessionmaker  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.seed.load import load  # noqa: E402

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASSWORD = "Ласточка-весна-2026"


@pytest.fixture(scope="session", autouse=True)
def database():
    eng = get_engine()
    with eng.begin() as c:
        c.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    cfg = Config(os.path.join(HERE, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(HERE, "alembic"))
    command.upgrade(cfg, "head")
    with get_sessionmaker()() as db:
        load(db)
    yield


@pytest.fixture(autouse=True)
def clean():
    with get_engine().begin() as c:
        c.execute(text("TRUNCATE training_attempts, threat_checks, audit_log, users, organizations RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    with get_sessionmaker()() as s:
        yield s


def register(client, email=None, password=PASSWORD, **extra):
    email = email or f"u{uuid.uuid4().hex[:10]}@example.org"
    r = client.post("/api/v1/auth/register", json={"email": email, "password": password, **extra})
    assert r.status_code == 201, r.text
    return email


def login(client, email, password=PASSWORD):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def new_user(client, role=None, org_id=None, share=False, **extra):
    email = register(client, **extra)
    if role or org_id or share:
        with get_sessionmaker()() as s:
            u = s.query(User).filter_by(email=email).one()
            if role:
                u.role = role
            if org_id:
                u.organization_id = org_id
            u.share_with_org = share
            s.commit()
    return email, login(client, email)
