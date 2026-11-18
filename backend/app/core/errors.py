from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger(__name__)


# ── Custom exceptions ────────────────────────────────────────────────
class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: list | None = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or []
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource"):
        super().__init__("NOT_FOUND", f"{resource} not found.", status_code=404)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required."):
        super().__init__("UNAUTHORIZED", message, status_code=401)


class ForbiddenError(AppError):
    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__("FORBIDDEN", message, status_code=403)


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists."):
        super().__init__("CONFLICT", message, status_code=409)


class ValidationError(AppError):
    def __init__(self, message: str, details: list | None = None):
        super().__init__("VALIDATION_ERROR", message, status_code=422, details=details)


# ── Error response format ────────────────────────────────────────────
def _error_response(code: str, message: str, details: list, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "details": details}},
    )


# ── Exception handlers ───────────────────────────────────────────────
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    if exc.status_code >= 500:
        logger.error("AppError: %s — %s", exc.code, exc.message)
    return _error_response(exc.code, exc.message, exc.details, exc.status_code)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"field": ".".join(str(loc) for loc in e["loc"]), "reason": e["msg"]}
        for e in exc.errors()
    ]
    return _error_response("VALIDATION_ERROR", "Request validation failed.", details, 422)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return _error_response(
        "INTERNAL_ERROR",
        "An unexpected error occurred. Please try again.",
        [],
        status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
