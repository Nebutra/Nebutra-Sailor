"""
Billing Microservice

FastAPI service for billing, subscriptions, usage tracking, and credits management.
"""

import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager

from fastapi import FastAPI

from _shared.errors import generic_exception_handler
from _shared.health import router as health_router
from _shared.middleware import RequestLoggingMiddleware
from _shared.otel import instrument_app
from app.api.v1 import (
    routes_billing,
    routes_credits,
    routes_subscriptions,
    routes_usage,
    routes_webhooks,
)
from app.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("Starting Billing Service on %s:%s", settings.HOST, settings.PORT)
    yield
    logger.info("Shutting down Billing Service")


app = FastAPI(
    title="Nebutra Billing Service",
    description="Billing, subscriptions, usage tracking, and credits management",
    version="0.1.0",
    lifespan=lifespan,
)

instrument_app(app, service_name="billing-service")
app.add_middleware(RequestLoggingMiddleware)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS is handled at the Hono API Gateway layer — do not add CORSMiddleware here.
# This service is internal and should not be exposed directly to browsers.

app.include_router(health_router)
app.include_router(routes_billing.router, prefix="/api/v1/billing", tags=["billing"])
app.include_router(
    routes_subscriptions.router, prefix="/api/v1/subscriptions", tags=["subscriptions"]
)
app.include_router(routes_usage.router, prefix="/api/v1/usage", tags=["usage"])
app.include_router(routes_credits.router, prefix="/api/v1/credits", tags=["credits"])
app.include_router(routes_webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "nebutra-billing",
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
