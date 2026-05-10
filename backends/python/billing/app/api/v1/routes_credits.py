"""
Credits Routes

Credit balance, transactions, and purchases.
"""

from datetime import datetime
from enum import StrEnum

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.credits_service import CreditsService

router = APIRouter()


# Enums
class CreditTransactionType(StrEnum):
    PURCHASE = "PURCHASE"
    USAGE = "USAGE"
    REFUND = "REFUND"
    BONUS = "BONUS"
    ADJUSTMENT = "ADJUSTMENT"
    EXPIRATION = "EXPIRATION"


# Request/Response Models
class GetBalanceResponse(BaseModel):
    organization_id: str
    balance: int
    dollar_value: float
    last_updated: datetime


class PurchaseCreditsRequest(BaseModel):
    organization_id: str
    amount_dollars: float
    payment_method_id: str | None = None


class PurchaseCreditsResponse(BaseModel):
    success: bool
    credits_added: int
    new_balance: int
    transaction_id: str
    payment_intent_id: str | None = None


class DeductCreditsRequest(BaseModel):
    organization_id: str
    credits: int
    reason: str
    metadata: dict | None = None


class DeductCreditsResponse(BaseModel):
    success: bool
    credits_deducted: int
    new_balance: int
    transaction_id: str


class CreditTransaction(BaseModel):
    id: str
    type: CreditTransactionType
    credits: int
    balance_after: int
    description: str
    created_at: datetime
    metadata: dict | None = None


class GetTransactionsResponse(BaseModel):
    organization_id: str
    transactions: list[CreditTransaction]
    total_count: int


class RefundCreditsRequest(BaseModel):
    organization_id: str
    transaction_id: str
    credits: int | None = None  # Partial refund
    reason: str


class AddBonusRequest(BaseModel):
    organization_id: str
    credits: int
    reason: str
    expires_at: datetime | None = None


# Dependencies
def get_credits_service() -> CreditsService:
    return CreditsService()


# Routes
@router.get("/{organization_id}/balance", response_model=GetBalanceResponse)
async def get_credit_balance(
    organization_id: str,
    service: CreditsService = Depends(get_credits_service),
):
    """Get credit balance for an organization"""
    try:
        balance = await service.get_balance(organization_id)
        return balance
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/purchase", response_model=PurchaseCreditsResponse)
async def purchase_credits(
    request: PurchaseCreditsRequest,
    service: CreditsService = Depends(get_credits_service),
):
    """Purchase credits"""
    try:
        result = await service.purchase_credits(
            organization_id=request.organization_id,
            amount_dollars=request.amount_dollars,
            payment_method_id=request.payment_method_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/deduct", response_model=DeductCreditsResponse)
async def deduct_credits(
    request: DeductCreditsRequest,
    service: CreditsService = Depends(get_credits_service),
):
    """Deduct credits from balance"""
    try:
        result = await service.deduct_credits(
            organization_id=request.organization_id,
            credits=request.credits,
            reason=request.reason,
            metadata=request.metadata,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{organization_id}/transactions", response_model=GetTransactionsResponse)
async def get_credit_transactions(
    organization_id: str,
    type: CreditTransactionType | None = None,
    limit: int = 50,
    offset: int = 0,
    service: CreditsService = Depends(get_credits_service),
):
    """Get credit transaction history"""
    try:
        result = await service.get_transactions(
            organization_id=organization_id,
            transaction_type=type,
            limit=limit,
            offset=offset,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/refund", response_model=DeductCreditsResponse)
async def refund_credits(
    request: RefundCreditsRequest,
    service: CreditsService = Depends(get_credits_service),
):
    """Refund credits"""
    try:
        result = await service.refund_credits(
            organization_id=request.organization_id,
            transaction_id=request.transaction_id,
            credits=request.credits,
            reason=request.reason,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/bonus", response_model=DeductCreditsResponse)
async def add_bonus_credits(
    request: AddBonusRequest,
    service: CreditsService = Depends(get_credits_service),
):
    """Add bonus credits (admin only)"""
    try:
        result = await service.add_bonus(
            organization_id=request.organization_id,
            credits=request.credits,
            reason=request.reason,
            expires_at=request.expires_at,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{organization_id}/check/{credits}")
async def check_credits(
    organization_id: str,
    credits: int,
    service: CreditsService = Depends(get_credits_service),
):
    """Check if organization has enough credits"""
    try:
        has_enough = await service.has_enough_credits(organization_id, credits)
        balance = await service.get_balance(organization_id)
        return {
            "has_enough": has_enough,
            "requested": credits,
            "balance": balance["balance"],
            "remaining_after": balance["balance"] - credits if has_enough else 0,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
