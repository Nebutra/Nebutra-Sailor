from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm_service import generate_text

router = APIRouter()


class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 1000
    temperature: float = 0.7
    model: str = "gpt-5.2"


class GenerateResponse(BaseModel):
    text: str
    model: str
    tokens_used: int


@router.post("/", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """Generate text using LLM"""
    try:
        result = await generate_text(
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            model=request.model,
        )
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error") from None
