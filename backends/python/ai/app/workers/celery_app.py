"""Celery runtime for ECS-hosted AI origin background work."""

from __future__ import annotations

import os
from dataclasses import dataclass

from celery import Celery
from kombu import Queue

CELERY_QUEUES = ("default", "ai", "document", "maintenance", "webhook")


@dataclass(frozen=True)
class CeleryRuntimeConfig:
    broker_url: str
    result_backend: str
    task_default_queue: str
    worker_concurrency: int
    worker_prefetch_multiplier: int


def _int_from_env(key: str, default: int) -> int:
    value = os.environ.get(key)
    if not value:
        return default
    return int(value)


def build_celery_config() -> CeleryRuntimeConfig:
    broker_url = (
        os.environ.get("CELERY_BROKER_URL")
        or os.environ.get("REDIS_URL")
        or "redis://localhost:6379/0"
    )
    result_backend = os.environ.get("CELERY_RESULT_BACKEND") or broker_url

    return CeleryRuntimeConfig(
        broker_url=broker_url,
        result_backend=result_backend,
        task_default_queue=os.environ.get("CELERY_TASK_DEFAULT_QUEUE", "default"),
        worker_concurrency=_int_from_env("CELERY_WORKER_CONCURRENCY", 1),
        worker_prefetch_multiplier=_int_from_env("CELERY_PREFETCH_MULTIPLIER", 1),
    )


def create_celery_app() -> Celery:
    config = build_celery_config()
    app = Celery("nebutra_ai", broker=config.broker_url, backend=config.result_backend)

    app.conf.update(
        accept_content=["json"],
        broker_connection_retry_on_startup=True,
        result_serializer="json",
        task_acks_late=True,
        task_default_queue=config.task_default_queue,
        task_queues=tuple(Queue(name) for name in CELERY_QUEUES),
        task_routes={
            "app.workers.celery_app.ai_healthcheck": {"queue": "ai"},
            "app.workers.document_tasks.*": {"queue": "document"},
            "app.workers.agent_tasks.*": {"queue": "ai"},
            "app.workers.maintenance_tasks.*": {"queue": "maintenance"},
            "app.workers.webhook_tasks.*": {"queue": "webhook"},
        },
        task_serializer="json",
        timezone="UTC",
        worker_concurrency=config.worker_concurrency,
        worker_prefetch_multiplier=config.worker_prefetch_multiplier,
    )
    return app


celery_app = create_celery_app()


@celery_app.task(name="app.workers.celery_app.ai_healthcheck")
def ai_healthcheck() -> dict[str, str]:
    return {"service": "python-ai", "status": "ok"}
