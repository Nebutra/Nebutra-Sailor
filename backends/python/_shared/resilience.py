"""
Resilience patterns for Nebutra Python microservices.

Provides:
  - retry()          decorator — exponential backoff with jitter
  - CircuitBreaker   class    — open/half-open/closed state machine
  - timeout()        decorator — wraps an async function with asyncio.wait_for

Usage:
    from _shared.resilience import retry, CircuitBreaker, timeout

    # Retry with exponential backoff
    @retry(max_attempts=3, base_delay=0.5)
    async def call_external_api(url: str) -> dict: ...

    # Circuit breaker — share one instance per downstream service
    _breaker = CircuitBreaker(name="openai", failure_threshold=5, recovery_timeout=30)

    async def chat_completion(prompt: str):
        async with _breaker:
            return await openai_client.chat(prompt)

    # Timeout
    @timeout(seconds=10)
    async def slow_query() -> list: ...
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from enum import Enum
from functools import wraps
from typing import Any, Callable, Type, Sequence

logger = logging.getLogger(__name__)


# ── Retry ─────────────────────────────────────────────────────────────────────


def retry(
    max_attempts: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 30.0,
    backoff: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Sequence[Type[Exception]] = (Exception,),
) -> Callable:
    """
    Async retry decorator with exponential backoff and optional jitter.

    Args:
        max_attempts: Total attempts (1 = no retry).
        base_delay: Initial wait in seconds.
        max_delay: Cap on wait time.
        backoff: Exponential base (2.0 = doubles each attempt).
        jitter: Add ±25% random variation to avoid thundering herd.
        retryable_exceptions: Only retry on these exception types.
    """

    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exc: Exception | None = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await fn(*args, **kwargs)
                except tuple(retryable_exceptions) as exc:  # type: ignore[misc]
                    last_exc = exc
                    if attempt == max_attempts:
                        break
                    delay = min(base_delay * (backoff ** (attempt - 1)), max_delay)
                    if jitter:
                        delay *= 1 + random.uniform(-0.25, 0.25)
                    logger.warning(
                        "Retry attempt %d/%d for %s after %.2fs: %s",
                        attempt,
                        max_attempts,
                        fn.__qualname__,
                        delay,
                        exc,
                    )
                    await asyncio.sleep(delay)
            raise last_exc  # type: ignore[misc]

        return wrapper

    return decorator


# ── Circuit Breaker ───────────────────────────────────────────────────────────


class CircuitState(str, Enum):
    CLOSED = "closed"        # Normal — requests pass through
    OPEN = "open"            # Tripped — requests fail fast
    HALF_OPEN = "half_open"  # Probing — one request let through


class CircuitBreakerOpen(RuntimeError):
    """Raised when a request is rejected because the circuit is open."""


class CircuitBreaker:
    """
    Thread-safe circuit breaker for async code.

    State machine:
      CLOSED → OPEN       when failure_threshold consecutive failures occur
      OPEN   → HALF_OPEN  after recovery_timeout seconds
      HALF_OPEN → CLOSED  on first success
      HALF_OPEN → OPEN    on first failure (reset timer)

    Usage as async context manager:
        async with breaker:
            result = await external_call()
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        success_threshold: int = 1,
    ) -> None:
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._opened_at: float | None = None
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        return self._state

    async def __aenter__(self) -> "CircuitBreaker":
        async with self._lock:
            if self._state == CircuitState.OPEN:
                elapsed = time.monotonic() - (self._opened_at or 0)
                if elapsed >= self.recovery_timeout:
                    logger.info("Circuit %s entering HALF_OPEN", self.name)
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
                else:
                    raise CircuitBreakerOpen(
                        f"Circuit '{self.name}' is OPEN. "
                        f"Retry after {self.recovery_timeout - elapsed:.1f}s."
                    )
        return self

    async def __aexit__(
        self,
        exc_type: type | None,
        exc_val: Exception | None,
        exc_tb: Any,
    ) -> bool:
        async with self._lock:
            if exc_type is not None and not issubclass(exc_type, CircuitBreakerOpen):
                # Failure path
                self._failure_count += 1
                self._success_count = 0
                if self._state == CircuitState.HALF_OPEN or self._failure_count >= self.failure_threshold:
                    self._state = CircuitState.OPEN
                    self._opened_at = time.monotonic()
                    logger.error(
                        "Circuit %s OPENED after %d failures",
                        self.name,
                        self._failure_count,
                    )
            else:
                # Success path
                self._failure_count = 0
                if self._state == CircuitState.HALF_OPEN:
                    self._success_count += 1
                    if self._success_count >= self.success_threshold:
                        self._state = CircuitState.CLOSED
                        logger.info("Circuit %s CLOSED (recovered)", self.name)
        return False  # never suppress exceptions


# ── Timeout ───────────────────────────────────────────────────────────────────


def timeout(seconds: float) -> Callable:
    """
    Async decorator that enforces a wall-clock timeout on the wrapped coroutine.

    Raises asyncio.TimeoutError if the function exceeds `seconds`.
    """

    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                return await asyncio.wait_for(fn(*args, **kwargs), timeout=seconds)
            except asyncio.TimeoutError:
                logger.error(
                    "Timeout after %.1fs in %s", seconds, fn.__qualname__
                )
                raise

        return wrapper

    return decorator
