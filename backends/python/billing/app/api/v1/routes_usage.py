"""
Usage Routes

Usage tracking, metering, and limits.
"""

from datetime import datetime
from enum import StrEnum

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.usage_service import UsageService

router = APIRouter()


# Enums
class UsageType(StrEnum):
    AI_TOKEN = "AI_TOKEN"  # noqa: S105
    API_CALL = "API_CALL"
    STORAGE = "STORAGE"
    BANDWIDTH = "BANDWIDTH"
    COMPUTE = "COMPUTE"


# Request/Response Models
class RecordUsageRequest(BaseModel):
    organization_id: str
    type: UsageType
    quantity: int
    resource: str | None = None
    metadata: dict | None = None


class RecordUsageResponse(BaseModel):
    success: bool
    usage_id: str
    current_usage: int
    limit: int
    remaining: int


class GetUsageRequest(BaseModel):
    organization_id: str
    type: UsageType | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class UsageSummary(BaseModel):
    type: UsageType
    current: int
    limit: int
    percentage: float
    overage: int
    overage_cost: float


class GetUsageResponse(BaseModel):
    organization_id: str
    period_start: datetime
    period_end: datetime
    usage: list[UsageSummary]
    total_cost: float


class CheckLimitRequest(BaseModel):
    organization_id: str
    type: UsageType
    quantity: int


class CheckLimitResponse(BaseModel):
    allowed: bool
    current: int
    limit: int
    remaining: int
    would_exceed: bool


# Dependencies
def get_usage_service() -> UsageService:
    return UsageService()


# Routes
@router.post("/record", response_model=RecordUsageResponse)
async def record_usage(
    request: RecordUsageRequest,
    service: UsageService = Depends(get_usage_service),
):
    """Record usage for an organization"""
    try:
        result = await service.record_usage(
            organization_id=request.organization_id,
            usage_type=request.type,
            quantity=request.quantity,
            resource=request.resource,
            metadata=request.metadata,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{organization_id}", response_model=GetUsageResponse)
async def get_usage(
    organization_id: str,
    type: UsageType | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    service: UsageService = Depends(get_usage_service),
):
    """Get usage summary for an organization"""
    try:
        usage = await service.get_usage(
            organization_id=organization_id,
            usage_type=type,
            start_date=start_date,
            end_date=end_date,
        )
        return usage
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/check-limit", response_model=CheckLimitResponse)
async def check_usage_limit(
    request: CheckLimitRequest,
    service: UsageService = Depends(get_usage_service),
):
    """Check if usage is within limits"""
    try:
        result = await service.check_limit(
            organization_id=request.organization_id,
            usage_type=request.type,
            quantity=request.quantity,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{organization_id}/limits")
async def get_usage_limits(
    organization_id: str,
    service: UsageService = Depends(get_usage_service),
):
    """Get usage limits for an organization"""
    try:
        limits = await service.get_limits(organization_id)
        return limits
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{organization_id}/reset")
async def reset_usage(
    organization_id: str,
    type: UsageType | None = None,
    service: UsageService = Depends(get_usage_service),
):
    """Reset usage counters (admin only)"""
    try:
        await service.reset_usage(organization_id, usage_type=type)
        return {"success": True, "message": "Usage reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
