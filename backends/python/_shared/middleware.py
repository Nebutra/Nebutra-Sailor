"""Shared middleware for all Python microservices."""

from __future__ import annotations

import time
import uuid
import logging
import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger(__name__)

# Header names — must match the Node.js api-gateway conventions
REQUEST_ID_HEADER = "x-request-id"
TRACE_ID_HEADER = "x-trace-id"


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured request logging with request-id propagation.

    For every inbound request this middleware:
    1. Extracts (or generates) a request-id from the X-Request-ID header
    2. Binds the request-id to a structlog context so all logs in the request
       automatically include it
    3. Echoes the request-id back in the response header so clients can correlate
    4. Logs method, path, status code, and wall-clock duration on completion
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Use upstream request-id if present (forwarded by api-gateway),
        # otherwise generate a new one for service-internal calls.
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        trace_id = request.headers.get(TRACE_ID_HEADER)

        # Bind to structlog context — all log calls within this request
        # automatically include request_id and trace_id.
        log = logger.bind(
            request_id=request_id,
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
        )

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            log.exception("Unhandled exception during request")
            raise

        duration_ms = (time.perf_counter() - start) * 1000

        log.info(
            "request completed",
            status_code=response.status_code,
            duration_ms=round(duration_ms, 1),
        )

        # Echo request-id back to the caller for end-to-end correlation
        response.headers[REQUEST_ID_HEADER] = request_id

        return response


class HealthCheckFilter(logging.Filter):
    """Suppress /health endpoint logs to reduce noise in high-frequency polling."""

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        return "/health" not in msg and "/readyz" not in msg and "/livez" not in msg
