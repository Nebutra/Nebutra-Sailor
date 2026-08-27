"""
Startup environment variable validation for all Python microservices.

Usage (in each service's main.py):
    from _shared.env import require_env

    # Call at module level so misconfiguration fails at import, not first request
    require_env(["DATABASE_URL", "REDIS_URL", "SERVICE_NAME"])

    # Or use the typed helper:
    settings = ServiceSettings()
"""

from __future__ import annotations

import os
import sys
import logging
from dataclasses import dataclass, field
from typing import Sequence

logger = logging.getLogger(__name__)


def require_env(names: Sequence[str], *, exit_on_missing: bool = True) -> dict[str, str]:
    """
    Validate that required environment variables are set and non-empty.

    Args:
        names: Environment variable names that must be present.
        exit_on_missing: If True (default), call sys.exit(1) on validation failure
            so the pod restarts and surfaces the error in logs. Set to False in tests.

    Returns:
        Dict mapping variable name → value for all present variables.

    Raises:
        RuntimeError: If exit_on_missing=False and variables are missing.
    """
    missing = [name for name in names if not os.environ.get(name)]

    if missing:
        msg = f"Missing required environment variables: {', '.join(missing)}"
        logger.critical(msg)
        if exit_on_missing:
            # Exit code 1 → K8s marks container as failed → restarts with backoff
            sys.exit(1)
        raise RuntimeError(msg)

    return {name: os.environ[name] for name in names}


def get_env(name: str, default: str | None = None, *, required: bool = False) -> str | None:
    """
    Get a single environment variable with optional default.

    Args:
        name: Environment variable name.
        default: Value to return if variable is not set.
        required: If True, raise RuntimeError if variable is missing (even if default provided).

    Returns:
        The variable value or default.
    """
    value = os.environ.get(name, default)
    if required and not value:
        raise RuntimeError(f"Required environment variable '{name}' is not set")
    return value


@dataclass
class BaseServiceSettings:
    """
    Common environment settings shared across all Python microservices.
    Extend this in each service's own settings class.

    Example:
        @dataclass
        class AiServiceSettings(BaseServiceSettings):
            openai_api_key: str = field(default_factory=lambda: require_env(["OPENAI_API_KEY"])["OPENAI_API_KEY"])
    """

    # Service identity
    service_name: str = field(default_factory=lambda: os.environ.get("SERVICE_NAME", "unknown-service"))
    environment: str = field(default_factory=lambda: os.environ.get("NODE_ENV", os.environ.get("ENVIRONMENT", "development")))

    # Observability
    otel_enabled: bool = field(default_factory=lambda: os.environ.get("OTEL_ENABLED", "false").lower() == "true")
    otel_endpoint: str | None = field(default_factory=lambda: os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"))
    log_level: str = field(default_factory=lambda: os.environ.get("LOG_LEVEL", "INFO").upper())

    # Network
    port: int = field(default_factory=lambda: int(os.environ.get("PORT", "8000")))
    host: str = field(default_factory=lambda: os.environ.get("HOST", "0.0.0.0"))

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"
