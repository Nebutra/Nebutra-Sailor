"""
Subscription Routes

Subscription management, plan changes, cancellations.
"""

from datetime import datetime
from enum import StrEnum

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.subscription_service import SubscriptionService

router = APIRouter()


# Enums
class SubscriptionStatus(StrEnum):
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELED = "CANCELED"
    UNPAID = "UNPAID"
    TRIALING = "TRIALING"
    PAUSED = "PAUSED"


class Plan(StrEnum):
    FREE = "FREE"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"


# Request/Response Models
class CreateSubscriptionRequest(BaseModel):
    organization_id: str
    price_id: str
    payment_method_id: str | None = None
    trial_days: int | None = None


class SubscriptionResponse(BaseModel):
    id: str
    organization_id: str
    plan: Plan
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    canceled_at: datetime | None = None
    trial_end: datetime | None = None


class UpdateSubscriptionRequest(BaseModel):
    price_id: str
    proration_behavior: str | None = "create_prorations"


class CancelSubscriptionRequest(BaseModel):
    cancel_at_period_end: bool = True
    reason: str | None = None


class PreviewChangeResponse(BaseModel):
    proration_amount: int
    next_invoice_amount: int
    immediate_charge: bool


# Dependencies
def get_subscription_service() -> SubscriptionService:
    return SubscriptionService()


# Routes
@router.post("", response_model=SubscriptionResponse)
async def create_subscription(
    request: CreateSubscriptionRequest,
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Create a new subscription"""
    try:
        subscription = await service.create_subscription(
            organization_id=request.organization_id,
            price_id=request.price_id,
            payment_method_id=request.payment_method_id,
            trial_days=request.trial_days,
        )
        return subscription
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{organization_id}", response_model=SubscriptionResponse)
async def get_subscription(
    organization_id: str,
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Get subscription for an organization"""
    try:
        subscription = await service.get_subscription(organization_id)
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        return subscription
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.patch("/{organization_id}", response_model=SubscriptionResponse)
async def update_subscription(
    organization_id: str,
    request: UpdateSubscriptionRequest,
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Update subscription (change plan)"""
    try:
        subscription = await service.update_subscription(
            organization_id=organization_id,
            price_id=request.price_id,
            proration_behavior=request.proration_behavior,
        )
        return subscription
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{organization_id}/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    organization_id: str,
    request: CancelSubscriptionRequest,
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Cancel subscription"""
    try:
        subscription = await service.cancel_subscription(
            organization_id=organization_id,
            cancel_at_period_end=request.cancel_at_period_end,
            reason=request.reason,
        )
        return subscription
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{organization_id}/resume", response_model=SubscriptionResponse)
async def resume_subscription(
    organization_id: str,
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Resume a canceled subscription"""
    try:
        subscription = await service.resume_subscription(organization_id)
        return subscription
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{organization_id}/pause", response_model=SubscriptionResponse)
async def pause_subscription(
    organization_id: str,
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Pause a subscription"""
    try:
        subscription = await service.pause_subscription(organization_id)
        return subscription
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{organization_id}/preview-change", response_model=PreviewChangeResponse)
async def preview_subscription_change(
    organization_id: str,
    request: UpdateSubscriptionRequest,
    service: SubscriptionService = Depends(get_subscription_service),
):
    """Preview subscription change (proration preview)"""
    try:
        preview = await service.preview_change(
            organization_id=organization_id,
            price_id=request.price_id,
        )
        return preview
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
