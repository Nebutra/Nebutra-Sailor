import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import FastAPI

from _shared.errors import generic_exception_handler
from _shared.health import router as health_router
from _shared.middleware import RequestLoggingMiddleware
from _shared.otel import instrument_app
from app.api.v1 import routes_web3

app = FastAPI(
    title="Nebutra Web3 Service",
    description="Blockchain data indexing and Web3 operations",
    version="0.1.0",
)

instrument_app(app, service_name="web3-service")
app.add_middleware(RequestLoggingMiddleware)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS is handled at the Hono API Gateway layer — do not add CORSMiddleware here.
# This service is internal and should not be exposed directly to browsers.

app.include_router(health_router)
app.include_router(routes_web3.router, prefix="/api/v1", tags=["web3"])


@app.get("/")
async def root():
    return {"service": "web3", "status": "running", "version": "0.1.0"}
