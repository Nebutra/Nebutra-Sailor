"""
Redis client for caching and rate limiting.
"""

import json
import logging
from typing import Any, Optional

import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool

from utils.config import get_settings

logger = logging.getLogger(__name__)

_pool: Optional[ConnectionPool] = None


async def get_redis_pool() -> ConnectionPool:
    """Get or create Redis connection pool."""
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = ConnectionPool.from_url(
            settings.upstash_redis_url,
            decode_responses=True,
            max_connections=10,
        )
    return _pool


async def get_redis() -> redis.Redis:
    """Get Redis client instance."""
    pool = await get_redis_pool()
    return redis.Redis(connection_pool=pool)


class CacheManager:
    """Cache manager with JSON serialization and TTL support."""

    def __init__(self, prefix: str = "nebutra"):
        self.prefix = prefix

    def _make_key(self, key: str) -> str:
        """Create prefixed cache key."""
        return f"{self.prefix}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        """Get cached value."""
        try:
            client = await get_redis()
            data = await client.get(self._make_key(key))
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.warning(f"Cache get error for {key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600,
    ) -> bool:
        """Set cached value with TTL."""
        try:
            client = await get_redis()
            await client.setex(
                self._make_key(key),
                ttl,
                json.dumps(value, default=str),
            )
            return True
        except Exception as e:
            logger.warning(f"Cache set error for {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete cached value."""
        try:
            client = await get_redis()
            await client.delete(self._make_key(key))
            return True
        except Exception as e:
            logger.warning(f"Cache delete error for {key}: {e}")
            return False

    async def get_or_set(
        self,
        key: str,
        fetch_fn,
        ttl: int = 3600,
    ) -> Any:
        """Get from cache or fetch and cache."""
        cached = await self.get(key)
        if cached is not None:
            return cached

        value = await fetch_fn()
        if value is not None:
            await self.set(key, value, ttl)
        return value


# Global cache manager instance
cache = CacheManager(prefix="nebutra:third-party")
