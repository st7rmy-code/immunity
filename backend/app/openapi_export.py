"""Выгрузка OpenAPI-схемы для фронтенда: python -m app.openapi_export > ../docs/openapi.json
Фронтенд генерирует из неё типы (npm run gen:api), поэтому контракт один."""
import json
import os
import sys

os.environ.setdefault("IMMUNITY_DATABASE_URL", "postgresql+psycopg://unused@localhost/unused")
os.environ.setdefault("IMMUNITY_JWT_SECRET", "openapi-export-only-" + "x" * 32)

from app.main import app  # noqa: E402

json.dump(app.openapi(), sys.stdout, ensure_ascii=False, indent=1)
sys.stdout.write("\n")
