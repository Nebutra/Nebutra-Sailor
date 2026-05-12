import os
import sys
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import FastAPI

from _shared.errors import generic_exception_handler
from _shared.health import router as health_router
from _shared.middleware import RequestLoggingMiddleware
from _shared.otel import instrument_app
from _shared.usage import start_usage_worker, stop_usage_worker
from app.api.v1 import routes_agents, routes_embed, routes_generate, routes_sandbox, routes_translate


@asynccontextmanager
async def lifespan(_app: FastAPI):
    start_usage_worker()
    yield
    await stop_usage_worker()


app = FastAPI(
    title="Nebutra AI Service",
    description="AI-powered generation, embedding, translation, sandbox, and agent orchestration",
    version="0.2.0",
    lifespan=lifespan,
)

instrument_app(app, service_name="ai-service")
app.add_middleware(RequestLoggingMiddleware)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS is handled at the Hono API Gateway layer — do not add CORSMiddleware here.

app.include_router(health_router)
app.include_router(routes_generate.router, prefix="/api/v1/generate", tags=["generate"])
app.include_router(routes_embed.router, prefix="/api/v1/embed", tags=["embed"])
app.include_router(routes_translate.router, prefix="/api/v1/translate", tags=["translate"])
app.include_router(routes_sandbox.router, prefix="/api/v1/sandbox", tags=["sandbox"])
app.include_router(routes_agents.router, prefix="/api/v1/agents", tags=["agents"])


@app.get("/")
async def root():
    return {"service": "ai", "status": "running", "version": "0.2.0"}
