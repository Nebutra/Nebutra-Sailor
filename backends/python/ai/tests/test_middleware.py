from fastapi import FastAPI
from fastapi.testclient import TestClient

from _shared.middleware import RequestLoggingMiddleware


def test_request_logging_prefers_nebutra_request_id_header():
    app = FastAPI()
    app.add_middleware(RequestLoggingMiddleware)

    @app.get("/ok")
    async def ok():
        return {"ok": True}

    response = TestClient(app).get(
        "/ok",
        headers={
            "x-nebutra-request-id": "req_nebutra",
            "x-request-id": "req_legacy",
        },
    )

    assert response.status_code == 200
    assert response.headers["x-nebutra-request-id"] == "req_nebutra"
    assert response.headers["x-request-id"] == "req_nebutra"
