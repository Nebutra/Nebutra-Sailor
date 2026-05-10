import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi import FastAPI

from _shared.errors import generic_exception_handler
from _shared.health import router as health_router
from _shared.middleware import RequestLoggingMiddleware
from _shared.otel import instrument_app
from app.api.v1 import routes_comments, routes_feed, routes_posts

app = FastAPI(
    title="Nebutra Content Service",
    description="Content management, feed, and comments",
    version="0.1.0",
)

instrument_app(app, service_name="content-service")
app.add_middleware(RequestLoggingMiddleware)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS is handled at the Hono API Gateway layer — do not add CORSMiddleware here.
# This service is internal and should not be exposed directly to browsers.

app.include_router(health_router)
app.include_router(routes_posts.router, prefix="/api/v1/posts", tags=["posts"])
app.include_router(routes_feed.router, prefix="/api/v1/feed", tags=["feed"])
app.include_router(routes_comments.router, prefix="/api/v1/comments", tags=["comments"])


@app.get("/")
async def root():
    return {"service": "content", "status": "running", "version": "0.1.0"}
