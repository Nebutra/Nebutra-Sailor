"""Shared middleware for all Python microservices."""

from __future__ import annotations

import hmac
import logging
import os
import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger(__name__)

# Header names — must match the Node.js api-gateway conventions
NEBUTRA_REQUEST_ID_HEADER = "x-nebutra-request-id"
REQUEST_ID_HEADER = "x-request-id"
TRACE_ID_HEADER = "x-trace-id"
GATEWAY_AUTH_HEADER = "x-nebutra-gateway-secret"

PUBLIC_HEALTH_PATHS = frozenset({"/health", "/ready", "/livez", "/readyz"})


class GatewaySecretMiddleware(BaseHTTPMiddleware):
    """
    Reject direct origin traffic when GATEWAY_SHARED_SECRET is configured.

    Cloudflare Workers is the public API entry. ECS/FastAPI origin traffic must
    arrive through that gateway, which forwards x-nebutra-gateway-secret.
    Health probes stay public so orchestrators can check liveness/readiness.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        expected = os.environ.get("GATEWAY_SHARED_SECRET")
        if not expected or request.url.path in PUBLIC_HEALTH_PATHS:
            return await call_next(request)

        actual = request.headers.get(GATEWAY_AUTH_HEADER)
        if not actual or not hmac.compare_digest(actual, expected):
            from starlette.responses import JSONResponse

            return JSONResponse(
                {"detail": "invalid_gateway_secret"},
                status_code=403,
            )

        return await call_next(request)


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
        request_id = (
            request.headers.get(NEBUTRA_REQUEST_ID_HEADER)
            or request.headers.get(REQUEST_ID_HEADER)
            or str(uuid.uuid4())
        )
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
        response.headers[NEBUTRA_REQUEST_ID_HEADER] = request_id
        response.headers[REQUEST_ID_HEADER] = request_id

        return response


class HealthCheckFilter(logging.Filter):
    """Suppress /health endpoint logs to reduce noise in high-frequency polling."""

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        return "/health" not in msg and "/readyz" not in msg and "/livez" not in msg
