"""
Product Hunt Service Layer.

Business logic for Product Hunt data with caching,
data transformation, and error handling.
"""

import logging
from datetime import datetime
from typing import Any, Optional

from clients.producthunt import (
    ph_client,
    ProductHuntClientError,
    ProductHuntRateLimitError,
)
from utils.config import get_settings
from utils.redis_client import cache

logger = logging.getLogger(__name__)


def _transform_post(raw_post: dict[str, Any]) -> dict[str, Any]:
    """Transform raw GraphQL post data to clean format."""
    # Extract topics from edges
    topics_data = raw_post.get("topics", {})
    topics = []
    if isinstance(topics_data, dict):
        edges = topics_data.get("edges", [])
        topics = [edge["node"] for edge in edges]
    elif isinstance(topics_data, list):
        topics = topics_data

    return {
        "id": raw_post.get("id"),
        "name": raw_post.get("name"),
        "slug": raw_post.get("slug"),
        "tagline": raw_post.get("tagline"),
        "description": raw_post.get("description"),
        "url": raw_post.get("url"),
        "website": raw_post.get("website"),
        "votes_count": raw_post.get("votesCount", 0),
        "comments_count": raw_post.get("commentsCount", 0),
        "reviews_count": raw_post.get("reviewsCount", 0),
        "reviews_rating": raw_post.get("reviewsRating"),
        "featured_at": raw_post.get("featuredAt"),
        "created_at": raw_post.get("createdAt"),
        "thumbnail": raw_post.get("thumbnail"),
        "media": raw_post.get("media", []),
        "topics": topics,
        "makers": raw_post.get("makers", []),
        "product_hunt_url": f"https://www.producthunt.com/posts/{raw_post.get('slug')}",
    }


class ProductHuntService:
    """
    Product Hunt service with caching and business logic.

    Features:
    - Automatic caching with configurable TTL
    - Data transformation and normalization
    - Graceful degradation on errors
    - Cache-first strategy for high-traffic endpoints

    Usage:
        service = ProductHuntService()
        posts = await service.get_trending_posts(topic="ai")
    """

    def __init__(self):
        self.settings = get_settings()
        self.client = ph_client

    # ===========================================
    # Posts
    # ===========================================

    async def get_posts(
        self,
        first: int = 20,
        after: Optional[str] = None,
        topic: Optional[str] = None,
        order: str = "VOTES",
        use_cache: bool = True,
    ) -> dict[str, Any]:
        """
        Get posts with caching.

        Args:
            first: Number of posts
            after: Pagination cursor
            topic: Topic filter
            order: Sort order
            use_cache: Whether to use cache

        Returns:
            Posts response with pagination info
        """
        cache_key = f"ph:posts:{topic or 'all'}:{order}:{first}:{after or 'start'}"

        if use_cache and not after:  # Only cache first page
            cached = await cache.get(cache_key)
            if cached:
                logger.debug(f"Cache hit for {cache_key}")
                return {
                    **cached,
                    "cached": True,
                    "cached_at": cached.get("cached_at"),
                }

        try:
            raw_data = await self.client.get_posts(
                first=first,
                after=after,
                topic=topic,
                order=order,
            )

            # Transform posts
            edges = raw_data.get("edges", [])
            posts = [_transform_post(edge["node"]) for edge in edges]

            result = {
                "posts": posts,
                "page_info": raw_data.get("pageInfo", {}),
                "total_count": raw_data.get("totalCount", 0),
                "cached": False,
                "cached_at": datetime.utcnow().isoformat(),
            }

            # Cache first page only
            if use_cache and not after:
                await cache.set(
                    cache_key,
                    result,
                    ttl=self.settings.ph_cache_ttl_posts,
                )

            return result

        except ProductHuntRateLimitError:
            logger.warning("PH rate limited, returning cached data if available")
            cached = await cache.get(cache_key)
            if cached:
                return {**cached, "cached": True, "stale": True}
            raise

        except ProductHuntClientError as e:
            logger.error(f"PH client error: {e}")
            cached = await cache.get(cache_key)
            if cached:
                return {**cached, "cached": True, "stale": True}
            raise

    async def get_post(
        self,
        slug: str,
        use_cache: bool = True,
    ) -> Optional[dict[str, Any]]:
        """
        Get single post by slug with caching.

        Args:
            slug: Post slug
            use_cache: Whether to use cache

        Returns:
            Post data or None
        """
        cache_key = f"ph:post:{slug}"

        if use_cache:
            cached = await cache.get(cache_key)
            if cached:
                return {
                    **cached,
                    "cached": True,
                    "cached_at": cached.get("cached_at"),
                }

        try:
            raw_post = await self.client.get_post(slug)
            if not raw_post:
                return None

            post = _transform_post(raw_post)
            result = {
                "post": post,
                "cached": False,
                "cached_at": datetime.utcnow().isoformat(),
            }

            if use_cache:
                await cache.set(
                    cache_key,
                    result,
                    ttl=self.settings.ph_cache_ttl_posts,
                )

            return result

        except ProductHuntClientError as e:
            logger.error(f"Failed to fetch post {slug}: {e}")
            cached = await cache.get(cache_key)
            if cached:
                return {**cached, "cached": True, "stale": True}
            return None

    async def get_trending_posts(
        self,
        first: int = 20,
        topic: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Get trending posts (today's top featured).

        Args:
            first: Number of posts
            topic: Optional topic filter

        Returns:
            Trending posts response
        """
        cache_key = f"ph:trending:{topic or 'all'}:{first}"

        cached = await cache.get(cache_key)
        if cached:
            return {**cached, "cached": True}

        try:
            raw_posts = await self.client.get_trending_posts(
                first=first,
                topic=topic,
            )

            posts = [_transform_post(post) for post in raw_posts]

            result = {
                "posts": posts,
                "total_count": len(posts),
                "cached": False,
                "cached_at": datetime.utcnow().isoformat(),
            }

            await cache.set(
                cache_key,
                result,
                ttl=self.settings.ph_cache_ttl_trending,
            )

            return result

        except ProductHuntClientError as e:
            logger.error(f"Failed to fetch trending: {e}")
            if cached:
                return {**cached, "cached": True, "stale": True}
            return {"posts": [], "total_count": 0, "error": str(e)}

    # ===========================================
    # Topics
    # ===========================================

    async def get_topics(
        self,
        first: int = 50,
    ) -> dict[str, Any]:
        """
        Get all topics with caching.

        Args:
            first: Number of topics

        Returns:
            Topics response
        """
        cache_key = f"ph:topics:{first}"

        cached = await cache.get(cache_key)
        if cached:
            return {**cached, "cached": True}

        try:
            topics = await self.client.get_topics(first=first)

            result = {
                "topics": topics,
                "total_count": len(topics),
                "cached": False,
                "cached_at": datetime.utcnow().isoformat(),
            }

            await cache.set(
                cache_key,
                result,
                ttl=self.settings.ph_cache_ttl_topics,
            )

            return result

        except ProductHuntClientError as e:
            logger.error(f"Failed to fetch topics: {e}")
            if cached:
                return {**cached, "cached": True, "stale": True}
            return {"topics": [], "error": str(e)}

    # ===========================================
    # Collections
    # ===========================================

    async def get_collections(
        self,
        first: int = 20,
    ) -> dict[str, Any]:
        """
        Get collections with caching.

        Args:
            first: Number of collections

        Returns:
            Collections response
        """
        cache_key = f"ph:collections:{first}"

        cached = await cache.get(cache_key)
        if cached:
            return {**cached, "cached": True}

        try:
            collections = await self.client.get_collections(first=first)

            result = {
                "collections": collections,
                "total_count": len(collections),
                "cached": False,
                "cached_at": datetime.utcnow().isoformat(),
            }

            await cache.set(
                cache_key,
                result,
                ttl=self.settings.ph_cache_ttl_collections,
            )

            return result

        except ProductHuntClientError as e:
            logger.error(f"Failed to fetch collections: {e}")
            if cached:
                return {**cached, "cached": True, "stale": True}
            return {"collections": [], "error": str(e)}

    # ===========================================
    # Cache Management
    # ===========================================

    async def invalidate_cache(self, pattern: str = "ph:*") -> bool:
        """
        Invalidate cache entries matching pattern.

        Args:
            pattern: Cache key pattern

        Returns:
            Success status
        """
        # Note: For production, implement pattern-based deletion
        # This is a simplified version
        logger.info(f"Cache invalidation requested for pattern: {pattern}")
        return True

    async def warm_cache(self) -> dict[str, bool]:
        """
        Pre-warm cache with common queries.

        Returns:
            Status of each cache operation
        """
        results = {}

        try:
            await self.get_trending_posts(first=20)
            results["trending"] = True
        except Exception as e:
            logger.error(f"Failed to warm trending cache: {e}")
            results["trending"] = False

        try:
            await self.get_topics(first=50)
            results["topics"] = True
        except Exception as e:
            logger.error(f"Failed to warm topics cache: {e}")
            results["topics"] = False

        try:
            await self.get_collections(first=20)
            results["collections"] = True
        except Exception as e:
            logger.error(f"Failed to warm collections cache: {e}")
            results["collections"] = False

        return results


# Global service instance
ph_service = ProductHuntService()
