from __future__ import annotations


def test_celery_app_uses_redis_backed_origin_defaults(monkeypatch):
    monkeypatch.delenv("CELERY_BROKER_URL", raising=False)
    monkeypatch.delenv("CELERY_RESULT_BACKEND", raising=False)
    monkeypatch.setenv("REDIS_URL", "redis://redis.internal:6379/2")

    from app.workers.celery_app import (
        CELERY_QUEUES,
        build_celery_config,
        celery_app,
    )

    config = build_celery_config()

    assert celery_app.main == "nebutra_ai"
    assert config.broker_url == "redis://redis.internal:6379/2"
    assert config.result_backend == "redis://redis.internal:6379/2"
    assert config.task_default_queue == "default"
    assert config.worker_prefetch_multiplier == 1
    assert set(CELERY_QUEUES) == {
        "default",
        "ai",
        "document",
        "maintenance",
        "webhook",
    }


def test_celery_config_prefers_explicit_broker_and_backend(monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://redis.internal:6379/2")
    monkeypatch.setenv("CELERY_BROKER_URL", "redis://broker.internal:6379/3")
    monkeypatch.setenv("CELERY_RESULT_BACKEND", "redis://results.internal:6379/4")
    monkeypatch.setenv("CELERY_WORKER_CONCURRENCY", "1")
    monkeypatch.setenv("CELERY_PREFETCH_MULTIPLIER", "1")

    from app.workers.celery_app import build_celery_config

    config = build_celery_config()

    assert config.broker_url == "redis://broker.internal:6379/3"
    assert config.result_backend == "redis://results.internal:6379/4"
    assert config.worker_concurrency == 1
    assert config.worker_prefetch_multiplier == 1
