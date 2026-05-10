import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import FastAPI

from _shared.errors import generic_exception_handler
from _shared.health import router as health_router
from _shared.middleware import RequestLoggingMiddleware
from _shared.otel import instrument_app
from app.api.v1 import routes_recsys

app = FastAPI(
    title="Nebutra Recommendation Service",
    description="AI-powered content recommendations using recall/rank pipeline",
    version="0.1.0",
)

instrument_app(app, service_name="recsys-service")
app.add_middleware(RequestLoggingMiddleware)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS is handled at the Hono API Gateway layer — do not add CORSMiddleware here.
# This service is internal and should not be exposed directly to browsers.

app.include_router(health_router)
app.include_router(routes_recsys.router, prefix="/api/v1/recommend", tags=["recommend"])


@app.get("/")
async def root():
    return {"service": "recsys", "status": "running", "version": "0.1.0"}
