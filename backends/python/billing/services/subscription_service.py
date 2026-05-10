"""
Subscription Service

Subscription lifecycle management.
"""

from datetime import datetime

import stripe

from app.config import settings

from .stripe_service import StripeService

# Plan to price ID mapping
PRICE_MAP = {
    "PRO_MONTHLY": settings.STRIPE_PRICE_ID_PRO_MONTHLY,
    "PRO_YEARLY": settings.STRIPE_PRICE_ID_PRO_YEARLY,
    "ENTERPRISE_MONTHLY": settings.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY,
    "ENTERPRISE_YEARLY": settings.STRIPE_PRICE_ID_ENTERPRISE_YEARLY,
}


class SubscriptionService:
    """Service for subscription management"""

    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.stripe_service = StripeService()

    def _map_stripe_status(self, status: str) -> str:
        """Map Stripe status to our status enum"""
        status_map = {
            "active": "ACTIVE",
            "past_due": "PAST_DUE",
            "canceled": "CANCELED",
            "unpaid": "UNPAID",
            "trialing": "TRIALING",
            "paused": "PAUSED",
            "incomplete": "PAST_DUE",
            "incomplete_expired": "CANCELED",
        }
        return status_map.get(status, "ACTIVE")

    def _get_plan_from_price(self, price_id: str) -> str:
        """Get plan name from price ID"""
        for plan, pid in PRICE_MAP.items():
            if pid == price_id:
                return plan.split("_")[0]  # PRO or ENTERPRISE
        return "FREE"

    async def create_subscription(
        self,
        organization_id: str,
        price_id: str,
        payment_method_id: str | None = None,
        trial_days: int | None = None,
    ) -> dict:
        """Create a new subscription"""
        customer = await self.stripe_service.get_customer_by_organization(
            organization_id
        )
        if not customer:
            raise ValueError(f"No customer found for organization {organization_id}")

        sub_params = {
            "customer": customer["id"],
            "items": [{"price": price_id}],
            "metadata": {"organization_id": organization_id},
        }

        if payment_method_id:
            sub_params["default_payment_method"] = payment_method_id

        if trial_days:
            sub_params["trial_period_days"] = trial_days

        subscription = stripe.Subscription.create(**sub_params)
        return self._format_subscription(subscription, organization_id)

    async def get_subscription(self, organization_id: str) -> dict | None:
        """Get subscription for an organization"""
        customer = await self.stripe_service.get_customer_by_organization(
            organization_id
        )
        if not customer:
            return None

        subscriptions = stripe.Subscription.list(
            customer=customer["id"],
            status="all",
            limit=1,
        )

        if subscriptions.data:
            return self._format_subscription(subscriptions.data[0], organization_id)
        return None

    async def update_subscription(
        self,
        organization_id: str,
        price_id: str,
        proration_behavior: str = "create_prorations",
    ) -> dict:
        """Update subscription (change plan)"""
        subscription = await self._get_stripe_subscription(organization_id)
        if not subscription:
            raise ValueError(
                f"No subscription found for organization {organization_id}"
            )

        # Update the subscription with new price
        updated = stripe.Subscription.modify(
            subscription.id,
            items=[
                {
                    "id": subscription["items"]["data"][0]["id"],
                    "price": price_id,
                }
            ],
            proration_behavior=proration_behavior,
        )
        return self._format_subscription(updated, organization_id)

    async def cancel_subscription(
        self,
        organization_id: str,
        cancel_at_period_end: bool = True,
        reason: str | None = None,
    ) -> dict:
        """Cancel subscription"""
        subscription = await self._get_stripe_subscription(organization_id)
        if not subscription:
            raise ValueError(
                f"No subscription found for organization {organization_id}"
            )

        if cancel_at_period_end:
            updated = stripe.Subscription.modify(
                subscription.id,
                cancel_at_period_end=True,
                metadata={"cancel_reason": reason} if reason else {},
            )
        else:
            updated = stripe.Subscription.cancel(subscription.id)

        return self._format_subscription(updated, organization_id)

    async def resume_subscription(self, organization_id: str) -> dict:
        """Resume a canceled subscription"""
        subscription = await self._get_stripe_subscription(organization_id)
        if not subscription:
            raise ValueError(
                f"No subscription found for organization {organization_id}"
            )

        if not subscription.cancel_at_period_end:
            raise ValueError("Subscription is not scheduled for cancellation")

        updated = stripe.Subscription.modify(
            subscription.id,
            cancel_at_period_end=False,
        )
        return self._format_subscription(updated, organization_id)

    async def pause_subscription(self, organization_id: str) -> dict:
        """Pause a subscription"""
        subscription = await self._get_stripe_subscription(organization_id)
        if not subscription:
            raise ValueError(
                f"No subscription found for organization {organization_id}"
            )

        updated = stripe.Subscription.modify(
            subscription.id,
            pause_collection={"behavior": "mark_uncollectible"},
        )
        return self._format_subscription(updated, organization_id)

    async def preview_change(
        self,
        organization_id: str,
        price_id: str,
    ) -> dict:
        """Preview subscription change (proration preview)"""
        subscription = await self._get_stripe_subscription(organization_id)
        if not subscription:
            raise ValueError(
                f"No subscription found for organization {organization_id}"
            )

        invoice = stripe.Invoice.upcoming(
            customer=subscription.customer,
            subscription=subscription.id,
            subscription_items=[
                {
                    "id": subscription["items"]["data"][0]["id"],
                    "price": price_id,
                }
            ],
        )

        return {
            "proration_amount": invoice.total - invoice.subtotal,
            "next_invoice_amount": invoice.total,
            "immediate_charge": invoice.total > 0,
        }

    async def _get_stripe_subscription(self, organization_id: str):
        """Get raw Stripe subscription object"""
        customer = await self.stripe_service.get_customer_by_organization(
            organization_id
        )
        if not customer:
            return None

        subscriptions = stripe.Subscription.list(
            customer=customer["id"],
            status="all",
            limit=1,
        )

        return subscriptions.data[0] if subscriptions.data else None

    def _format_subscription(self, subscription, organization_id: str) -> dict:
        """Format subscription for API response"""
        price_id = subscription["items"]["data"][0]["price"]["id"]

        return {
            "id": subscription.id,
            "organization_id": organization_id,
            "plan": self._get_plan_from_price(price_id),
            "status": self._map_stripe_status(subscription.status),
            "current_period_start": datetime.fromtimestamp(
                subscription.current_period_start
            ),
            "current_period_end": datetime.fromtimestamp(
                subscription.current_period_end
            ),
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "canceled_at": datetime.fromtimestamp(subscription.canceled_at)
            if subscription.canceled_at
            else None,
            "trial_end": datetime.fromtimestamp(subscription.trial_end)
            if subscription.trial_end
            else None,
        }
