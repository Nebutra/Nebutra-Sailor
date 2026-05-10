"""
Usage Service

Usage tracking, metering, and limits.
"""

import uuid
from datetime import UTC, datetime

from dateutil.relativedelta import relativedelta

# Default plan limits
PLAN_LIMITS = {
    "FREE": {
        "AI_TOKEN": 1000,
        "API_CALL": 100,
        "STORAGE": 100 * 1024 * 1024,  # 100 MB
        "BANDWIDTH": 1 * 1024 * 1024 * 1024,  # 1 GB
        "COMPUTE": 60,  # minutes
    },
    "PRO": {
        "AI_TOKEN": 100000,
        "API_CALL": 10000,
        "STORAGE": 10 * 1024 * 1024 * 1024,  # 10 GB
        "BANDWIDTH": 100 * 1024 * 1024 * 1024,  # 100 GB
        "COMPUTE": 600,  # minutes
    },
    "ENTERPRISE": {
        "AI_TOKEN": -1,  # Unlimited
        "API_CALL": -1,
        "STORAGE": -1,
        "BANDWIDTH": -1,
        "COMPUTE": -1,
    },
}

# Overage pricing per unit
OVERAGE_PRICING = {
    "AI_TOKEN": 0.00001,  # $0.01 per 1000 tokens
    "API_CALL": 0.0001,  # $0.10 per 1000 calls
    "STORAGE": 0.00000001,  # $0.01 per GB
    "BANDWIDTH": 0.00000001,
    "COMPUTE": 0.001,  # $0.06 per minute
}


class UsageService:
    """Service for usage tracking and metering"""

    def __init__(self):
        # In production, this would use Redis or database
        self._usage_store: dict = {}

    async def record_usage(
        self,
        organization_id: str,
        usage_type: str,
        quantity: int,
        resource: str | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """Record usage for an organization"""
        usage_id = str(uuid.uuid4())
        period = self._get_current_period()
        key = f"{organization_id}:{period}:{usage_type}"

        # Get current usage
        current = self._usage_store.get(key, 0)
        new_usage = current + quantity
        self._usage_store[key] = new_usage

        # Get limit for organization's plan
        plan = await self._get_organization_plan(organization_id)
        limit = PLAN_LIMITS.get(plan, PLAN_LIMITS["FREE"]).get(usage_type, 0)

        return {
            "success": True,
            "usage_id": usage_id,
            "current_usage": new_usage,
            "limit": limit,
            "remaining": max(0, limit - new_usage) if limit > 0 else -1,
        }

    async def get_usage(
        self,
        organization_id: str,
        usage_type: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> dict:
        """Get usage summary for an organization"""
        period = self._get_current_period()
        plan = await self._get_organization_plan(organization_id)
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["FREE"])

        usage_summaries = []
        total_cost = 0.0

        types_to_check = (
            [usage_type] if usage_type else list(PLAN_LIMITS["FREE"].keys())
        )

        for utype in types_to_check:
            key = f"{organization_id}:{period}:{utype}"
            current = self._usage_store.get(key, 0)
            limit = limits.get(utype, 0)

            overage = max(0, current - limit) if limit > 0 else 0
            overage_cost = overage * OVERAGE_PRICING.get(utype, 0)
            total_cost += overage_cost

            percentage = (current / limit * 100) if limit > 0 else 0

            usage_summaries.append(
                {
                    "type": utype,
                    "current": current,
                    "limit": limit,
                    "percentage": min(percentage, 100),
                    "overage": overage,
                    "overage_cost": overage_cost,
                }
            )

        now = datetime.now(UTC)
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_end = period_start + relativedelta(months=1)

        return {
            "organization_id": organization_id,
            "period_start": period_start,
            "period_end": period_end,
            "usage": usage_summaries,
            "total_cost": total_cost,
        }

    async def check_limit(
        self,
        organization_id: str,
        usage_type: str,
        quantity: int,
    ) -> dict:
        """Check if usage is within limits"""
        period = self._get_current_period()
        key = f"{organization_id}:{period}:{usage_type}"
        current = self._usage_store.get(key, 0)

        plan = await self._get_organization_plan(organization_id)
        limit = PLAN_LIMITS.get(plan, PLAN_LIMITS["FREE"]).get(usage_type, 0)

        # -1 means unlimited
        if limit < 0:
            return {
                "allowed": True,
                "current": current,
                "limit": -1,
                "remaining": -1,
                "would_exceed": False,
            }

        remaining = limit - current
        would_exceed = current + quantity > limit

        return {
            "allowed": not would_exceed,
            "current": current,
            "limit": limit,
            "remaining": max(0, remaining),
            "would_exceed": would_exceed,
        }

    async def get_limits(self, organization_id: str) -> dict:
        """Get usage limits for an organization"""
        plan = await self._get_organization_plan(organization_id)
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["FREE"])

        period = self._get_current_period()
        result = {"plan": plan, "limits": {}}

        for usage_type, limit in limits.items():
            key = f"{organization_id}:{period}:{usage_type}"
            current = self._usage_store.get(key, 0)
            result["limits"][usage_type] = {
                "limit": limit,
                "current": current,
                "remaining": max(0, limit - current) if limit > 0 else -1,
            }

        return result

    async def reset_usage(
        self,
        organization_id: str,
        usage_type: str | None = None,
    ) -> None:
        """Reset usage counters"""
        period = self._get_current_period()

        if usage_type:
            key = f"{organization_id}:{period}:{usage_type}"
            self._usage_store[key] = 0
        else:
            # Reset all types
            for utype in PLAN_LIMITS["FREE"].keys():
                key = f"{organization_id}:{period}:{utype}"
                self._usage_store[key] = 0

    def _get_current_period(self) -> str:
        """Get current billing period string"""
        now = datetime.now(UTC)
        return now.strftime("%Y-%m")

    async def _get_organization_plan(self, organization_id: str) -> str:
        """Get organization's current plan"""
        # In production, fetch from database
        # For now, return FREE as default
        return "FREE"
