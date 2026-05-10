from fastapi import APIRouter, Header
from pydantic import BaseModel

from .routes_posts import posts_db

router = APIRouter()


class FeedItem(BaseModel):
    id: str
    title: str
    body: str
    author_id: str
    created_at: str


class FeedResponse(BaseModel):
    items: list[FeedItem]
    next_cursor: str | None = None
    has_more: bool = False


@router.get("/", response_model=FeedResponse)
async def get_feed(
    x_organization_id: str = Header(...),
    limit: int = 20,
    cursor: str | None = None,
):
    """Get content feed for organization (reverse chronological)"""
    # Filter posts by organization and published status
    org_posts = [
        p
        for p in posts_db.values()
        if p["organization_id"] == x_organization_id and p["status"] == "published"
    ]

    # Sort by created_at descending
    org_posts.sort(key=lambda x: x["created_at"], reverse=True)

    # Simple pagination
    items = org_posts[:limit]

    return {
        "items": [
            {
                "id": p["id"],
                "title": p["title"],
                "body": p["body"][:200] + "..." if len(p["body"]) > 200 else p["body"],
                "author_id": p["author_id"],
                "created_at": p["created_at"].isoformat(),
            }
            for p in items
        ],
        "has_more": len(org_posts) > limit,
        "next_cursor": items[-1]["id"] if items and len(org_posts) > limit else None,
    }


@router.get("/trending", response_model=FeedResponse)
async def get_trending(
    x_organization_id: str = Header(...),
    limit: int = 10,
):
    """Get trending content (placeholder - would use engagement metrics)"""
    org_posts = [
        p
        for p in posts_db.values()
        if p["organization_id"] == x_organization_id and p["status"] == "published"
    ]

    # For now, just return most recent as "trending"
    org_posts.sort(key=lambda x: x["created_at"], reverse=True)
    items = org_posts[:limit]

    return {
        "items": [
            {
                "id": p["id"],
                "title": p["title"],
                "body": p["body"][:200] + "..." if len(p["body"]) > 200 else p["body"],
                "author_id": p["author_id"],
                "created_at": p["created_at"].isoformat(),
            }
            for p in items
        ],
        "has_more": False,
    }
