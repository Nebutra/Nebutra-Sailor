"""Standardized error responses for all services."""

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    status_code: int


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all exception handler that returns a consistent JSON shape."""
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="internal_server_error",
            detail=str(exc) if __debug__ else None,
            status_code=500,
        ).model_dump(),
    )
