"""Точка входа API: uvicorn app.main:app"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import VERSION, router
from app.core import errors
from app.core.config import get_settings


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title="Иммунитет к мошенникам — API", version=VERSION,
                  description="Модульный монолит MVP. ИИ-функции на сервере не подключены (нет AI Gateway).",
                  openapi_url="/api/v1/openapi.json", docs_url="/api/v1/docs", redoc_url=None)
    errors.install(app)
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
        if request.url.path.startswith("/api/v1/") and not request.url.path.startswith("/api/v1/docs"):
            resp.headers.setdefault("Cache-Control", "no-store")
        return resp

    app.include_router(router)
    return app


app = create_app()
