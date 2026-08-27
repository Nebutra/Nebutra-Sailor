"""
Resilience patterns for Nebutra Python microservices.

Provides:
  - retry()          decorator — exponential backoff with jitter (tenacity)
  - CircuitBreaker   class    — open/half-open/closed state machine (self-maintained;
                                tenacity does not cover circuit breaking — see note below)
  - timeout()        decorator — wraps an async function with asyncio.wait_for

Retry/backoff responsibility split:
  - tenacity (@retry)  handles: attempt counting, exponential backoff, jitter,
                                retryable-exception filtering, per-attempt logging.
  - CircuitBreaker     handles: failure-rate tracking, open/half-open/closed state,
                                fast-fail while OPEN, recovery probing.
  Both can be stacked: apply @retry on the inner call, wrap with `async with breaker`
  outside — tenacity retries within a single circuit-breaker invocation.

  NOTE: if the `circuitbreaker` PyPI package (https://pypi.org/project/circuitbreaker/)
  is ever evaluated to replace the self-maintained CircuitBreaker below, that decision
  should be tracked as a separate governance item; it is NOT part of this migration.

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
import time
from enum import Enum
from functools import wraps
from typing import Any, Callable, Sequence, Type

from tenacity import (
    RetryCallState,
    retry as tenacity_retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

logger = logging.getLogger(__name__)


# ── Retry (tenacity) ──────────────────────────────────────────────────────────


def retry(
    max_attempts: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 30.0,
    backoff: float = 2.0,  # kept for API compatibility; tenacity uses its own factor
    jitter: bool = True,   # kept for API compatibility; tenacity always adds jitter here
    retryable_exceptions: Sequence[Type[Exception]] = (Exception,),
) -> Callable:
    """
    Async retry decorator with exponential backoff and jitter (backed by tenacity).

    Args:
        max_attempts: Total attempts (1 = no retry).
        base_delay: Initial wait in seconds (tenacity `initial` + `exp_base` control).
        max_delay: Cap on wait time in seconds.
        backoff: Exponential base — retained for signature compatibility; tenacity
                 uses `exp_base` which mirrors this value.
        jitter: Retained for signature compatibility; tenacity's
                wait_exponential_jitter always adds random jitter up to `max`.
        retryable_exceptions: Only retry on these exception types.
    """

    def _before_sleep(retry_state: RetryCallState) -> None:
        exc = retry_state.outcome.exception() if retry_state.outcome else None
        logger.warning(
            "Retry attempt %d/%d for %s after %.2fs: %s",
            retry_state.attempt_number,
            max_attempts,
            retry_state.fn.__qualname__ if retry_state.fn else "unknown",
            retry_state.next_action.sleep if retry_state.next_action else 0.0,
            exc,
        )

    def decorator(fn: Callable) -> Callable:
        # Build the tenacity-decorated variant at decoration time so the wrapping
        # overhead is paid once, not on every call.
        decorated = tenacity_retry(
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential_jitter(
                initial=base_delay,
                exp_base=backoff,
                max=max_delay,
            ),
            retry=retry_if_exception_type(tuple(retryable_exceptions)),  # type: ignore[arg-type]
            before_sleep=_before_sleep,
            reraise=True,
        )(fn)

        @wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            return await decorated(*args, **kwargs)

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
