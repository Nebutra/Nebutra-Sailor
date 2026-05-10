"""
Product Hunt API Routes.

REST API endpoints for accessing Product Hunt data
with caching and rate limiting.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from slowapi import Limiter
from slowapi.util import get_remote_address

from services.producthunt import ph_service
from clients.producthunt import ProductHuntClientError, ProductHuntRateLimitError

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ===========================================
# Posts Endpoints
# ===========================================


@router.get("/posts")
async def get_posts(
    first: int = Query(20, ge=1, le=50, description="Number of posts"),
    after: Optional[str] = Query(None, description="Pagination cursor"),
    topic: Optional[str] = Query(None, description="Filter by topic slug"),
    order: str = Query(
        "VOTES",
        description="Sort order",
        regex="^(VOTES|NEWEST|RANKING)$",
    ),
):
    """
    Get posts from Product Hunt.

    - **first**: Number of posts to fetch (1-50)
    - **after**: Cursor for pagination
    - **topic**: Filter by topic slug (e.g., "ai", "saas", "developer-tools")
    - **order**: Sort order (VOTES, NEWEST, RANKING)

    Returns posts with pagination info and cache status.
    """
    try:
        result = await ph_service.get_posts(
            first=first,
            after=after,
            topic=topic,
            order=order,
        )
        return result
    except ProductHuntRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Product Hunt API rate limit exceeded. Please try again later.",
        )
    except ProductHuntClientError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/posts/trending")
async def get_trending_posts(
    first: int = Query(20, ge=1, le=50, description="Number of posts"),
    topic: Optional[str] = Query(None, description="Filter by topic slug"),
):
    """
    Get trending posts (today's featured, sorted by votes).

    - **first**: Number of posts to fetch (1-50)
    - **topic**: Filter by topic slug

    Returns today's top trending products.
    """
    try:
        result = await ph_service.get_trending_posts(first=first, topic=topic)
        return result
    except ProductHuntRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Product Hunt API rate limit exceeded. Please try again later.",
        )
    except ProductHuntClientError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/posts/{slug}")
async def get_post(slug: str):
    """
    Get a single post by slug.

    - **slug**: Post slug (e.g., "notion", "linear")

    Returns detailed post information.
    """
    try:
        result = await ph_service.get_post(slug)
        if not result:
            raise HTTPException(status_code=404, detail="Post not found")
        return result
    except ProductHuntRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Product Hunt API rate limit exceeded. Please try again later.",
        )
    except ProductHuntClientError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ===========================================
# Topics Endpoints
# ===========================================


@router.get("/topics")
async def get_topics(
    first: int = Query(50, ge=1, le=100, description="Number of topics"),
):
    """
    Get all topics/categories.

    - **first**: Number of topics to fetch (1-100)

    Returns list of topics with post counts.
    """
    try:
        result = await ph_service.get_topics(first=first)
        return result
    except ProductHuntRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Product Hunt API rate limit exceeded. Please try again later.",
        )
    except ProductHuntClientError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ===========================================
# Collections Endpoints
# ===========================================


@router.get("/collections")
async def get_collections(
    first: int = Query(20, ge=1, le=50, description="Number of collections"),
):
    """
    Get collections.

    - **first**: Number of collections to fetch (1-50)

    Returns list of curated collections.
    """
    try:
        result = await ph_service.get_collections(first=first)
        return result
    except ProductHuntRateLimitError:
        raise HTTPException(
            status_code=429,
            detail="Product Hunt API rate limit exceeded. Please try again later.",
        )
    except ProductHuntClientError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ===========================================
# Cache Management
# ===========================================


@router.post("/cache/warm")
async def warm_cache():
    """
    Pre-warm cache with common queries.

    This endpoint triggers cache warming for trending posts,
    topics, and collections.
    """
    result = await ph_service.warm_cache()
    return {"status": "ok", "warmed": result}


@router.delete("/cache")
async def invalidate_cache():
    """
    Invalidate all Product Hunt cache entries.

    Use this to force refresh all cached data.
    """
    result = await ph_service.invalidate_cache()
    return {"status": "ok", "invalidated": result}
