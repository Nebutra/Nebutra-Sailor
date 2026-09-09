# Nebutra AI origin — FastAPI app plus the Celery worker that drains its task envelope.
#
# The build context is `backends/python`, not `backends/python/ai`: the service imports `_shared`,
# which lives beside it. A context rooted at `ai/` cannot see that package, which is why the older
# Dockerfile built an image that failed at first import.
#
#   docker build -f backends/python/Dockerfile backends/python
#
# One image, two roles. The API runs uvicorn; the worker runs celery against the same code, chosen
# by the process command — Fly process groups, or the two services in docker-compose.origin.yml.
FROM python:3.11-slim@sha256:06fa338add3c2ab8daeff7304a6bb204c68f67743b13553a8999605fc8097c58

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

WORKDIR /app

# curl is the healthcheck; the rest is what asyncpg and oss2 need to install.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY ai/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY _shared ./_shared
COPY ai ./ai

WORKDIR /app/ai

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
