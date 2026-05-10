import random

from fastapi import APIRouter, Header
from pydantic import BaseModel

router = APIRouter()


class RecommendRequest(BaseModel):
    user_id: str | None = None
    limit: int = 10
    context: dict | None = None


class RecommendedItem(BaseModel):
    id: str
    score: float
    reason: str


class RecommendResponse(BaseModel):
    items: list[RecommendedItem]
    model_version: str


class SimilarRequest(BaseModel):
    item_id: str
    limit: int = 5


# Mock item pool for demo
MOCK_ITEMS = [f"item_{i}" for i in range(1, 101)]


@router.post("/", response_model=RecommendResponse)
async def get_recommendations(
    request: RecommendRequest,
    x_organization_id: str = Header(...),
):
    """
    Get personalized recommendations using recall/rank pipeline:
    1. Recall: Retrieve candidate items (embedding similarity, collaborative filtering)
    2. Rank: Score candidates using ML model
    3. Filter: Apply business rules
    4. Return top-k
    """
    # Mock recall phase - would use embedding similarity in production
    candidates = random.sample(MOCK_ITEMS, min(50, len(MOCK_ITEMS)))

    # Mock rank phase - would use trained model in production
    scored_items = [
        {
            "id": item_id,
            "score": round(random.uniform(0.5, 1.0), 3),  # noqa: S311
            "reason": random.choice(  # noqa: S311
                [
                    "Similar to your recent views",
                    "Popular in your organization",
                    "Based on your interests",
                    "Trending content",
                ]
            ),
        }
        for item_id in candidates
    ]

    # Sort by score and take top-k
    scored_items.sort(key=lambda x: x["score"], reverse=True)
    top_items = scored_items[: request.limit]

    return {
        "items": top_items,
        "model_version": "v0.1.0-mock",
    }


@router.post("/similar", response_model=RecommendResponse)
async def get_similar_items(
    request: SimilarRequest,
    x_organization_id: str = Header(...),
):
    """Get items similar to a given item (item-to-item recommendations)"""
    # Mock similar items - would use embedding similarity in production
    similar = random.sample(
        [i for i in MOCK_ITEMS if i != request.item_id],
        min(request.limit, len(MOCK_ITEMS) - 1),
    )

    return {
        "items": [
            {
                "id": item_id,
                "score": round(random.uniform(0.6, 0.95), 3),  # noqa: S311
                "reason": f"Similar to {request.item_id}",
            }
            for item_id in similar
        ],
        "model_version": "v0.1.0-mock",
    }


@router.post("/explore")
async def explore_recommendations(
    x_organization_id: str = Header(...),
    limit: int = 10,
):
    """Get exploration recommendations (diversity-focused)"""
    # For exploration, prioritize diversity over relevance
    diverse_items = random.sample(MOCK_ITEMS, min(limit, len(MOCK_ITEMS)))

    return {
        "items": [
            {
                "id": item_id,
                "score": round(random.uniform(0.3, 0.7), 3),  # noqa: S311
                "reason": "Discover something new",
            }
            for item_id in diverse_items
        ],
        "model_version": "v0.1.0-mock",
        "strategy": "exploration",
    }
