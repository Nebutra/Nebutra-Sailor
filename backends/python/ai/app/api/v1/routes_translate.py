from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.translate_service import translate_text

router = APIRouter()


class TranslateRequest(BaseModel):
    text: str
    source: str = "en"
    target: str


class TranslateResponse(BaseModel):
    translatedText: str  # noqa: N815
    source: str
    target: str


@router.post("/", response_model=TranslateResponse)
async def translate(request: TranslateRequest):
    """Translate text between languages"""
    try:
        result = await translate_text(
            text=request.text,
            source=request.source,
            target=request.target,
        )
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error") from None
