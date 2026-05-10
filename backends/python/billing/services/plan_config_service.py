"""
Plan Config Service

Database-driven plan configuration with Redis caching.
Supports:
- Dynamic plan/feature/limit configuration
- Customer-level overrides
- Plan versioning (grandfathering)
"""

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from utils.redis_client import get_redis_client
from utils.supabase_client import get_supabase_client


@dataclass
class FeatureValue:
    enabled: bool
    value: Any
    metadata: dict | None = None


@dataclass
class LimitConfig:
    limit: int  # -1 = unlimited
    unit: str
    reset_period: str  # monthly, daily, never
    overage_rate: float | None = None


@dataclass
class PlanConfig:
    id: str
    slug: str
    name: str
    plan: str  # FREE, PRO, ENTERPRISE
    version: str
    interval: str
    amount: float
    currency: str
    trial_days: int
    features: dict[str, FeatureValue]
    limits: dict[str, LimitConfig]
    is_active: bool


@dataclass
class ResolvedConfig:
    plan: PlanConfig
    features: dict[str, FeatureValue]
    limits: dict[str, LimitConfig]
    overrides: dict[str, list[str]]


class PlanConfigService:
    """Service for database-driven plan configuration"""

    _instance: Optional["PlanConfigService"] = None

    def __init__(self, cache_ttl: int = 300):
        self.supabase = get_supabase_client()
        self.redis = get_redis_client()
        self.cache_ttl = cache_ttl
        self.cache_prefix = "billing:config:"

    @classmethod
    def get_instance(cls) -> "PlanConfigService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def get_config(self, organization_id: str) -> ResolvedConfig:
        """Get resolved configuration for an organization"""
        cache_key = f"{self.cache_prefix}org:{organization_id}"

        # Try cache first
        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                return self._deserialize_config(json.loads(cached))

        # Get organization's subscription
        subscription = await self._get_subscription(organization_id)

        # Check for grandfathered plan version
        plan_version = await self._get_customer_plan_version(organization_id)

        # Determine effective plan
        effective_plan = None
        if plan_version and (
            not plan_version.get("expires_at")
            or datetime.fromisoformat(plan_version["expires_at"]) > datetime.now()
        ):
            effective_plan = await self._get_plan_by_id(plan_version["plan_id"])
        elif subscription:
            effective_plan = await self._get_plan_by_id(subscription["pricing_plan_id"])

        # Default to free plan
        if not effective_plan:
            effective_plan = await self._get_free_plan()

        # Build base config
        features = self._build_features(effective_plan)
        limits = self._build_limits(effective_plan)

        # Apply customer overrides
        feature_overrides = await self._get_feature_overrides(organization_id)
        limit_overrides = await self._get_limit_overrides(organization_id)

        overridden_features = []
        for override in feature_overrides:
            features[override["feature_key"]] = FeatureValue(
                enabled=bool(override["value"]),
                value=override["value"],
                metadata={"override_reason": override.get("reason")},
            )
            overridden_features.append(override["feature_key"])

        overridden_limits = []
        for override in limit_overrides:
            limit_def = override.get("limit_def", {})
            limits[limit_def.get("key", "")] = LimitConfig(
                limit=int(override["limit_value"]),
                unit=limit_def.get("unit", ""),
                reset_period=limit_def.get("reset_period", "monthly"),
                overage_rate=float(override["overage_rate"])
                if override.get("overage_rate")
                else None,
            )
            overridden_limits.append(limit_def.get("key", ""))

        config = ResolvedConfig(
            plan=self._format_plan_config(effective_plan),
            features=features,
            limits=limits,
            overrides={
                "plan_version": plan_version["id"] if plan_version else None,
                "features": overridden_features,
                "limits": overridden_limits,
            },
        )

        # Cache result
        if self.redis:
            await self.redis.set(
                cache_key, json.dumps(self._serialize_config(config)), ex=self.cache_ttl
            )

        return config

    async def get_plan(
        self, slug: str, version: str | None = None
    ) -> PlanConfig | None:
        """Get plan by slug"""
        cache_key = f"{self.cache_prefix}plan:{slug}:{version or 'latest'}"

        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                return self._deserialize_plan_config(json.loads(cached))

        plan = await self._get_plan_by_slug(slug, version)
        if not plan:
            return None

        config = self._format_plan_config(plan)

        if self.redis:
            await self.redis.set(
                cache_key,
                json.dumps(self._serialize_plan_config(config)),
                ex=self.cache_ttl,
            )

        return config

    async def get_plans(self, public_only: bool = True) -> list[PlanConfig]:
        """Get all active plans"""
        cache_key = f"{self.cache_prefix}plans:{'public' if public_only else 'all'}"

        if self.redis:
            cached = await self.redis.get(cache_key)
            if cached:
                return [self._deserialize_plan_config(p) for p in json.loads(cached)]

        query = (
            self.supabase.table("pricing_plans")
            .select(
                "*, plan_features(*, feature:feature_definitions(*)), plan_limits:plan_usage_limits(*, limit_def:usage_limit_definitions(*))"  # noqa: E501
            )
            .eq("is_active", True)
        )

        if public_only:
            query = query.eq("is_public", True)

        result = query.execute()
        plans = result.data or []

        # Deduplicate by slug
        unique_plans = {}
        for plan in plans:
            if plan["slug"] not in unique_plans:
                unique_plans[plan["slug"]] = plan

        configs = [self._format_plan_config(p) for p in unique_plans.values()]

        if self.redis:
            await self.redis.set(
                cache_key,
                json.dumps([self._serialize_plan_config(c) for c in configs]),
                ex=self.cache_ttl,
            )

        return configs

    async def has_feature(self, organization_id: str, feature_key: str) -> bool:
        """Check if organization has feature access"""
        config = await self.get_config(organization_id)
        feature = config.features.get(feature_key)
        return feature.enabled if feature else False

    async def get_limit(
        self, organization_id: str, limit_key: str
    ) -> LimitConfig | None:
        """Get usage limit for organization"""
        config = await self.get_config(organization_id)
        return config.limits.get(limit_key)

    async def check_limit(
        self,
        organization_id: str,
        limit_key: str,
        current_usage: int,
        additional_usage: int = 0,
    ) -> dict:
        """Check if usage is within limits"""
        limit_config = await self.get_limit(organization_id, limit_key)

        if not limit_config:
            return {
                "allowed": False,
                "limit": 0,
                "current": current_usage,
                "remaining": 0,
                "would_exceed": True,
            }

        # -1 means unlimited
        if limit_config.limit == -1:
            return {
                "allowed": True,
                "limit": -1,
                "current": current_usage,
                "remaining": -1,
                "would_exceed": False,
            }

        remaining = limit_config.limit - current_usage
        would_exceed = current_usage + additional_usage > limit_config.limit

        return {
            "allowed": not would_exceed,
            "limit": limit_config.limit,
            "current": current_usage,
            "remaining": max(0, remaining),
            "would_exceed": would_exceed,
        }

    async def invalidate_org(self, organization_id: str) -> None:
        """Invalidate cache for organization"""
        if self.redis:
            cache_key = f"{self.cache_prefix}org:{organization_id}"
            await self.redis.delete(cache_key)

    async def invalidate_plans(self) -> None:
        """Invalidate all plan caches"""
        if self.redis:
            keys = await self.redis.keys(f"{self.cache_prefix}plan:*")
            if keys:
                await self.redis.delete(*keys)
            await self.redis.delete(f"{self.cache_prefix}plans:public")
            await self.redis.delete(f"{self.cache_prefix}plans:all")

    # ============================================
    # Private Methods
    # ============================================

    async def _get_subscription(self, organization_id: str) -> dict | None:
        result = (
            self.supabase.table("subscriptions")
            .select("*")
            .eq("organization_id", organization_id)
            .in_("status", ["ACTIVE", "TRIALING"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    async def _get_customer_plan_version(self, organization_id: str) -> dict | None:
        result = (
            self.supabase.table("customer_plan_versions")
            .select("*")
            .eq("organization_id", organization_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    async def _get_plan_by_id(self, plan_id: str) -> dict | None:
        result = (
            self.supabase.table("pricing_plans")
            .select(
                "*, plan_features(*, feature:feature_definitions(*)), plan_limits:plan_usage_limits(*, limit_def:usage_limit_definitions(*))"  # noqa: E501
            )
            .eq("id", plan_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    async def _get_plan_by_slug(
        self, slug: str, version: str | None = None
    ) -> dict | None:
        query = (
            self.supabase.table("pricing_plans")
            .select(
                "*, plan_features(*, feature:feature_definitions(*)), plan_limits:plan_usage_limits(*, limit_def:usage_limit_definitions(*))"  # noqa: E501
            )
            .eq("slug", slug)
            .eq("is_active", True)
        )

        if version:
            query = query.eq("version", version)

        result = query.order("effective_from", desc=True).limit(1).execute()
        return result.data[0] if result.data else None

    async def _get_free_plan(self) -> dict:
        result = (
            self.supabase.table("pricing_plans")
            .select(
                "*, plan_features(*, feature:feature_definitions(*)), plan_limits:plan_usage_limits(*, limit_def:usage_limit_definitions(*))"  # noqa: E501
            )
            .eq("plan", "FREE")
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        if result.data:
            return result.data[0]

        # Fallback hardcoded defaults
        return {
            "id": "default-free",
            "slug": "free",
            "name": "Free",
            "plan": "FREE",
            "version": "v1",
            "interval": "MONTHLY",
            "amount": 0,
            "currency": "USD",
            "trial_days": 0,
            "is_active": True,
            "plan_features": [],
            "plan_limits": [],
        }

    async def _get_feature_overrides(self, organization_id: str) -> list[dict]:
        result = (
            self.supabase.table("customer_feature_overrides")
            .select("*")
            .eq("organization_id", organization_id)
            .execute()
        )

        # Filter expired
        now = datetime.now()
        return [
            o
            for o in (result.data or [])
            if not o.get("expires_at") or datetime.fromisoformat(o["expires_at"]) > now
        ]

    async def _get_limit_overrides(self, organization_id: str) -> list[dict]:
        result = (
            self.supabase.table("customer_usage_limits")
            .select("*, limit_def:usage_limit_definitions(*)")
            .eq("organization_id", organization_id)
            .execute()
        )

        now = datetime.now()
        return [
            o
            for o in (result.data or [])
            if not o.get("expires_at") or datetime.fromisoformat(o["expires_at"]) > now
        ]

    def _build_features(self, plan: dict) -> dict[str, FeatureValue]:
        features = {}
        for pf in plan.get("plan_features", []):
            feature = pf.get("feature", {})
            features[feature.get("key", "")] = FeatureValue(
                enabled=pf.get("is_enabled", False),
                value=pf.get("value"),
                metadata=pf.get("metadata"),
            )
        return features

    def _build_limits(self, plan: dict) -> dict[str, LimitConfig]:
        limits = {}
        for pl in plan.get("plan_limits", []):
            limit_def = pl.get("limit_def", {})
            limits[limit_def.get("key", "")] = LimitConfig(
                limit=int(pl.get("limit_value", 0)),
                unit=limit_def.get("unit", ""),
                reset_period=limit_def.get("reset_period", "monthly"),
                overage_rate=float(pl.get("overage_rate"))
                if pl.get("overage_rate")
                else (
                    float(limit_def.get("overage_rate"))
                    if limit_def.get("overage_rate")
                    else None
                ),
            )
        return limits

    def _format_plan_config(self, plan: dict) -> PlanConfig:
        return PlanConfig(
            id=plan.get("id", ""),
            slug=plan.get("slug", ""),
            name=plan.get("name", ""),
            plan=plan.get("plan", "FREE"),
            version=plan.get("version", "v1"),
            interval=plan.get("interval", "MONTHLY"),
            amount=float(plan.get("amount", 0)),
            currency=plan.get("currency", "USD"),
            trial_days=plan.get("trial_days", 0),
            features=self._build_features(plan),
            limits=self._build_limits(plan),
            is_active=plan.get("is_active", True),
        )

    def _serialize_config(self, config: ResolvedConfig) -> dict:
        return {
            "plan": self._serialize_plan_config(config.plan),
            "features": {
                k: {"enabled": v.enabled, "value": v.value, "metadata": v.metadata}
                for k, v in config.features.items()
            },
            "limits": {
                k: {
                    "limit": v.limit,
                    "unit": v.unit,
                    "reset_period": v.reset_period,
                    "overage_rate": v.overage_rate,
                }
                for k, v in config.limits.items()
            },
            "overrides": config.overrides,
        }

    def _deserialize_config(self, data: dict) -> ResolvedConfig:
        return ResolvedConfig(
            plan=self._deserialize_plan_config(data["plan"]),
            features={k: FeatureValue(**v) for k, v in data["features"].items()},
            limits={k: LimitConfig(**v) for k, v in data["limits"].items()},
            overrides=data["overrides"],
        )

    def _serialize_plan_config(self, config: PlanConfig) -> dict:
        return {
            "id": config.id,
            "slug": config.slug,
            "name": config.name,
            "plan": config.plan,
            "version": config.version,
            "interval": config.interval,
            "amount": config.amount,
            "currency": config.currency,
            "trial_days": config.trial_days,
            "features": {
                k: {"enabled": v.enabled, "value": v.value, "metadata": v.metadata}
                for k, v in config.features.items()
            },
            "limits": {
                k: {
                    "limit": v.limit,
                    "unit": v.unit,
                    "reset_period": v.reset_period,
                    "overage_rate": v.overage_rate,
                }
                for k, v in config.limits.items()
            },
            "is_active": config.is_active,
        }

    def _deserialize_plan_config(self, data: dict) -> PlanConfig:
        return PlanConfig(
            id=data["id"],
            slug=data["slug"],
            name=data["name"],
            plan=data["plan"],
            version=data["version"],
            interval=data["interval"],
            amount=data["amount"],
            currency=data["currency"],
            trial_days=data["trial_days"],
            features={k: FeatureValue(**v) for k, v in data["features"].items()},
            limits={k: LimitConfig(**v) for k, v in data["limits"].items()},
            is_active=data["is_active"],
        )


# Singleton accessor
def get_plan_config_service() -> PlanConfigService:
    return PlanConfigService.get_instance()
