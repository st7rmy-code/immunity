"""Единый формат ошибок: {"error": {"code", "message", "fields"}}."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("immunity")

STATUS_CODES = {400: "bad_request", 401: "unauthorized", 403: "forbidden", 404: "not_found", 405: "method_not_allowed",
                409: "conflict", 413: "payload_too_large", 422: "validation_error", 423: "locked", 429: "rate_limited"}


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, fields: dict[str, str] | None = None, headers: dict[str, str] | None = None):
        self.status, self.code, self.message, self.fields, self.headers = status, code, message, fields, headers


def body(code: str, message: str, fields: dict[str, str] | None = None) -> dict:
    e: dict = {"code": code, "message": message}
    if fields:
        e["fields"] = fields
    return {"error": e}


def _loc(loc) -> str:
    parts = [str(x) for x in loc if x not in ("body", "query", "path")]
    return ".".join(parts) or "body"


def install(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(_: Request, e: ApiError):
        return JSONResponse(body(e.code, e.message, e.fields), status_code=e.status, headers=e.headers)

    @app.exception_handler(RequestValidationError)
    async def _val(_: Request, e: RequestValidationError):
        fields: dict[str, str] = {}
        for err in e.errors():
            msg = str(err.get("msg", "некорректное значение"))
            if msg.startswith("Value error, "):
                msg = msg[len("Value error, "):]
            fields.setdefault(_loc(err.get("loc", ())), msg)
        return JSONResponse(body("validation_error", "Проверьте поля запроса", fields), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, e: StarletteHTTPException):
        code = STATUS_CODES.get(e.status_code, "error")
        msg = e.detail if isinstance(e.detail, str) and e.status_code != 404 else ("Не найдено" if e.status_code == 404 else "Ошибка запроса")
        return JSONResponse(body(code, msg), status_code=e.status_code, headers=getattr(e, "headers", None))

    @app.exception_handler(Exception)
    async def _any(_: Request, e: Exception):
        log.exception("unhandled error")
        return JSONResponse(body("internal_error", "Внутренняя ошибка. Попробуйте позже."), status_code=500)
