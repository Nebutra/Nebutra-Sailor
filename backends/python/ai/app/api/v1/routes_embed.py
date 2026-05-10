from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.embedding_service import create_embedding

router = APIRouter()


class EmbedRequest(BaseModel):
    text: str
    model: str = "text-embedding-3-small"


class EmbedResponse(BaseModel):
    embedding: list[float]
    model: str
    dimensions: int


@router.post("/", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    """Create text embedding"""
    try:
        result = await create_embedding(
            text=request.text,
            model=request.model,
        )
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error") from None
