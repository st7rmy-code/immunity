"""Точка входа API: uvicorn app.main:app"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import VERSION, router
from app.core import errors
from app.core.config import get_settings


PUBLIC_CONTENT = {"/api/v1/scenarios", "/api/v1/skills", "/api/v1/audiences", "/api/v1/guides"}


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="Иммунитет к мошенникам — API", version=VERSION,
                  description="Модульный монолит MVP. ИИ-функции на сервере не подключены (нет AI Gateway).",
                  openapi_url="/api/v1/openapi.json", docs_url="/api/v1/docs", redoc_url=None)
    errors.install(app)
    app.add_middleware(GZipMiddleware, minimum_size=1024)  # сценарии и памятки сжимаются в 5–8 раз
    if s.cors_origins:
        app.add_middleware(CORSMiddleware, allow_origins=s.cors_origins, allow_credentials=False,
                           allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])

    @app.middleware("http")
    async def limits_and_headers(request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl and (not cl.isdigit() or int(cl) > s.max_body_bytes):
            return JSONResponse(errors.body("payload_too_large", "Слишком большой запрос"), status_code=413)
        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        path = request.url.path
        if request.method == "GET" and resp.status_code == 200 and (path in PUBLIC_CONTENT or path.startswith("/api/v1/scenarios/")):
            # справочный контент одинаков для всех: браузер и прокси могут хранить его 5 минут
            resp.headers.setdefault("Cache-Control", "public, max-age=300")
        elif path.startswith("/api/v1/") and not path.startswith("/api/v1/docs"):
            resp.headers.setdefault("Cache-Control", "no-store")  # личные данные не кэшируются
        return resp

    app.include_router(router)
    return app


app = create_app()
