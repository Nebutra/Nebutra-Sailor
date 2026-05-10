"""
Webhook Service

Handle Stripe webhook events with full database persistence
and notification dispatch.
"""

from datetime import UTC, datetime

import structlog

from utils.supabase_client import get_supabase_client

logger = structlog.get_logger()


class NotificationDispatcher:
    """
    Dispatch notification events for downstream consumption.

    In production, these events are consumed by the Node.js
    @nebutra/email package via the event bus (Inngest).
    For now, we emit structured log events that can be picked
    up by any subscriber.
    """

    @staticmethod
    async def send(event_type: str, payload: dict) -> None:
        """Dispatch a notification event (non-blocking, fire-and-forget)."""
        try:
            logger.info(
                "notification_dispatched",
                event_type=event_type,
                payload=payload,
            )
            # In production: publish to Inngest / event bus
            # await event_bus.publish(event_type, payload)
        except Exception as exc:
            # Never let notification failures break webhook processing
            logger.warning(
                "notification_dispatch_failed",
                event_type=event_type,
                error=str(exc),
            )


class WebhookService:
    """Service for handling Stripe webhooks"""

    def __init__(self):
        self._db = get_supabase_client()
        self._notify = NotificationDispatcher()

    async def handle_event(self, event: dict) -> dict:
        """Route and handle Stripe webhook events"""
        event_type = event["type"]
        data = event["data"]["object"]

        handler = self._get_handler(event_type)
        if handler:
            return await handler(data)

        logger.info("unhandled_webhook_event", event_type=event_type)
        return {"handled": False, "event_type": event_type}

    def _get_handler(self, event_type: str):
        """Get handler for event type"""
        handlers = {
            # Checkout
            "checkout.session.completed": self._handle_checkout_completed,
            "checkout.session.expired": self._handle_checkout_expired,
            # Subscriptions
            "customer.subscription.created": self._handle_subscription_created,
            "customer.subscription.updated": self._handle_subscription_updated,
            "customer.subscription.deleted": self._handle_subscription_deleted,
            "customer.subscription.trial_will_end": self._handle_trial_will_end,
            # Invoices
            "invoice.paid": self._handle_invoice_paid,
            "invoice.payment_failed": self._handle_invoice_payment_failed,
            "invoice.upcoming": self._handle_invoice_upcoming,
            # Payments
            "payment_intent.succeeded": self._handle_payment_succeeded,
            "payment_intent.payment_failed": self._handle_payment_failed,
            # Customer
            "customer.created": self._handle_customer_created,
            "customer.updated": self._handle_customer_updated,
            "customer.deleted": self._handle_customer_deleted,
        }
        return handlers.get(event_type)

    # ─── Helpers ──────────────────────────────────────────────────────────

    def _get_plan_from_subscription(self, data: dict) -> str:
        """Derive plan name from Stripe subscription data."""
        items = data.get("items", {}).get("data", [])
        if not items:
            return "FREE"

        price_id = items[0].get("price", {}).get("id", "")

        # Match against known price IDs from config
        from app.config import settings

        price_to_plan = {
            settings.STRIPE_PRICE_ID_PRO_MONTHLY: "PRO",
            settings.STRIPE_PRICE_ID_PRO_YEARLY: "PRO",
            settings.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY: "ENTERPRISE",
            settings.STRIPE_PRICE_ID_ENTERPRISE_YEARLY: "ENTERPRISE",
        }
        return price_to_plan.get(price_id, "PRO")

    def _map_stripe_status(self, status: str) -> str:
        """Map Stripe subscription status to internal enum."""
        return {
            "active": "ACTIVE",
            "past_due": "PAST_DUE",
            "canceled": "CANCELED",
            "unpaid": "UNPAID",
            "trialing": "TRIALING",
            "paused": "PAUSED",
            "incomplete": "PAST_DUE",
            "incomplete_expired": "CANCELED",
        }.get(status, "ACTIVE")

    # ─── Checkout ─────────────────────────────────────────────────────────

    async def _handle_checkout_completed(self, data: dict) -> dict:
        """Handle successful checkout"""
        organization_id = data.get("metadata", {}).get("organization_id")
        subscription_id = data.get("subscription")
        customer_id = data.get("customer")

        logger.info(
            "checkout_completed",
            organization_id=organization_id,
            subscription_id=subscription_id,
            customer_id=customer_id,
        )

        # 1. Update organization subscription status in database
        if organization_id:
            self._db.table("organizations").update(
                {
                    "stripe_customer_id": customer_id,
                    "stripe_subscription_id": subscription_id,
                    "subscription_status": "ACTIVE",
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", organization_id).execute()

            # 2. Send welcome email
            await self._notify.send(
                "billing.checkout.completed",
                {
                    "organization_id": organization_id,
                    "subscription_id": subscription_id,
                    "customer_id": customer_id,
                },
            )

            # 3. Provision resources (set initial plan entitlements)
            self._db.table("entitlements").upsert(
                {
                    "organization_id": organization_id,
                    "plan": "PRO",  # Default; overridden by subscription.created
                    "is_active": True,
                    "provisioned_at": datetime.now(UTC).isoformat(),
                }
            ).execute()

        return {
            "handled": True,
            "organization_id": organization_id,
            "subscription_id": subscription_id,
        }

    async def _handle_checkout_expired(self, data: dict) -> dict:
        """Handle expired checkout session"""
        session_id = data.get("id")
        logger.info("checkout_expired", session_id=session_id)
        return {"handled": True, "session_id": session_id}

    # ─── Subscriptions ────────────────────────────────────────────────────

    async def _handle_subscription_created(self, data: dict) -> dict:
        """Handle new subscription"""
        subscription_id = data.get("id")
        customer_id = data.get("customer")
        status = data.get("status")
        organization_id = data.get("metadata", {}).get("organization_id")
        plan = self._get_plan_from_subscription(data)

        logger.info(
            "subscription_created",
            subscription_id=subscription_id,
            organization_id=organization_id,
            status=status,
            plan=plan,
        )

        if organization_id:
            # Create subscription record in database
            self._db.table("subscriptions").upsert(
                {
                    "id": subscription_id,
                    "organization_id": organization_id,
                    "stripe_customer_id": customer_id,
                    "status": self._map_stripe_status(status),
                    "plan": plan,
                    "current_period_start": datetime.fromtimestamp(
                        data.get("current_period_start", 0), tz=UTC
                    ).isoformat(),
                    "current_period_end": datetime.fromtimestamp(
                        data.get("current_period_end", 0), tz=UTC
                    ).isoformat(),
                    "created_at": datetime.now(UTC).isoformat(),
                }
            ).execute()

            # Update organization plan
            self._db.table("organizations").update(
                {
                    "plan": plan,
                    "subscription_status": self._map_stripe_status(status),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", organization_id).execute()

        return {
            "handled": True,
            "subscription_id": subscription_id,
            "organization_id": organization_id,
        }

    async def _handle_subscription_updated(self, data: dict) -> dict:
        """Handle subscription update"""
        subscription_id = data.get("id")
        status = data.get("status")
        cancel_at_period_end = data.get("cancel_at_period_end")
        organization_id = data.get("metadata", {}).get("organization_id")
        plan = self._get_plan_from_subscription(data)

        logger.info(
            "subscription_updated",
            subscription_id=subscription_id,
            organization_id=organization_id,
            status=status,
            cancel_at_period_end=cancel_at_period_end,
        )

        if organization_id:
            # Update subscription record in database
            self._db.table("subscriptions").update(
                {
                    "status": self._map_stripe_status(status),
                    "plan": plan,
                    "cancel_at_period_end": cancel_at_period_end,
                    "current_period_start": datetime.fromtimestamp(
                        data.get("current_period_start", 0), tz=UTC
                    ).isoformat(),
                    "current_period_end": datetime.fromtimestamp(
                        data.get("current_period_end", 0), tz=UTC
                    ).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", subscription_id).execute()

            # Update organization plan if changed
            self._db.table("organizations").update(
                {
                    "plan": plan,
                    "subscription_status": self._map_stripe_status(status),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", organization_id).execute()

            # Handle downgrades/upgrades — notify so downstream can adjust entitlements
            await self._notify.send(
                "billing.subscription.plan_changed",
                {
                    "organization_id": organization_id,
                    "subscription_id": subscription_id,
                    "new_plan": plan,
                    "status": status,
                    "cancel_at_period_end": cancel_at_period_end,
                },
            )

        return {
            "handled": True,
            "subscription_id": subscription_id,
            "status": status,
        }

    async def _handle_subscription_deleted(self, data: dict) -> dict:
        """Handle subscription cancellation"""
        subscription_id = data.get("id")
        organization_id = data.get("metadata", {}).get("organization_id")

        logger.info(
            "subscription_deleted",
            subscription_id=subscription_id,
            organization_id=organization_id,
        )

        if organization_id:
            # Update subscription status to canceled
            self._db.table("subscriptions").update(
                {
                    "status": "CANCELED",
                    "canceled_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", subscription_id).execute()

            # Downgrade organization to free plan
            self._db.table("organizations").update(
                {
                    "plan": "FREE",
                    "subscription_status": "CANCELED",
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", organization_id).execute()

            # Send cancellation email
            await self._notify.send(
                "billing.subscription.canceled",
                {
                    "organization_id": organization_id,
                    "subscription_id": subscription_id,
                },
            )

        return {
            "handled": True,
            "subscription_id": subscription_id,
            "organization_id": organization_id,
        }

    async def _handle_trial_will_end(self, data: dict) -> dict:
        """Handle trial ending soon"""
        subscription_id = data.get("id")
        trial_end = data.get("trial_end")
        organization_id = data.get("metadata", {}).get("organization_id")

        logger.info(
            "trial_will_end",
            subscription_id=subscription_id,
            organization_id=organization_id,
            trial_end=trial_end,
        )

        # Send trial ending email
        await self._notify.send(
            "billing.trial.ending",
            {
                "organization_id": organization_id,
                "subscription_id": subscription_id,
                "trial_end": trial_end,
            },
        )

        return {
            "handled": True,
            "subscription_id": subscription_id,
            "trial_end": trial_end,
        }

    # ─── Invoices ─────────────────────────────────────────────────────────

    async def _handle_invoice_paid(self, data: dict) -> dict:
        """Handle successful payment"""
        invoice_id = data.get("id")
        subscription_id = data.get("subscription")
        amount_paid = data.get("amount_paid")
        customer_id = data.get("customer")

        logger.info(
            "invoice_paid",
            invoice_id=invoice_id,
            subscription_id=subscription_id,
            amount_paid=amount_paid,
        )

        # Create invoice record
        self._db.table("invoices").upsert(
            {
                "id": invoice_id,
                "stripe_customer_id": customer_id,
                "subscription_id": subscription_id,
                "amount_paid": amount_paid,
                "currency": data.get("currency", "usd"),
                "status": "PAID",
                "paid_at": datetime.now(UTC).isoformat(),
                "invoice_url": data.get("hosted_invoice_url"),
                "invoice_pdf": data.get("invoice_pdf"),
            }
        ).execute()

        # Send receipt email
        organization_id = data.get("metadata", {}).get("organization_id")
        await self._notify.send(
            "billing.invoice.paid",
            {
                "organization_id": organization_id,
                "invoice_id": invoice_id,
                "amount_paid": amount_paid,
                "invoice_url": data.get("hosted_invoice_url"),
            },
        )

        return {
            "handled": True,
            "invoice_id": invoice_id,
            "amount_paid": amount_paid,
        }

    async def _handle_invoice_payment_failed(self, data: dict) -> dict:
        """Handle failed payment"""
        invoice_id = data.get("id")
        subscription_id = data.get("subscription")
        attempt_count = data.get("attempt_count")

        logger.warning(
            "invoice_payment_failed",
            invoice_id=invoice_id,
            subscription_id=subscription_id,
            attempt_count=attempt_count,
        )

        # Send payment failed email
        organization_id = data.get("metadata", {}).get("organization_id")
        await self._notify.send(
            "billing.invoice.payment_failed",
            {
                "organization_id": organization_id,
                "invoice_id": invoice_id,
                "attempt_count": attempt_count,
                "next_attempt": data.get("next_payment_attempt"),
            },
        )

        # Update subscription status if subscription exists
        if subscription_id:
            self._db.table("subscriptions").update(
                {
                    "status": "PAST_DUE",
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", subscription_id).execute()

        return {
            "handled": True,
            "invoice_id": invoice_id,
            "attempt_count": attempt_count,
        }

    async def _handle_invoice_upcoming(self, data: dict) -> dict:
        """Handle upcoming invoice notification"""
        subscription_id = data.get("subscription")
        amount_due = data.get("amount_due")

        logger.info(
            "invoice_upcoming",
            subscription_id=subscription_id,
            amount_due=amount_due,
        )

        # Send upcoming invoice email
        organization_id = data.get("metadata", {}).get("organization_id")
        await self._notify.send(
            "billing.invoice.upcoming",
            {
                "organization_id": organization_id,
                "subscription_id": subscription_id,
                "amount_due": amount_due,
            },
        )

        return {"handled": True, "amount_due": amount_due}

    # ─── Payments ─────────────────────────────────────────────────────────

    async def _handle_payment_succeeded(self, data: dict) -> dict:
        """Handle successful one-time payment"""
        payment_intent_id = data.get("id")
        amount = data.get("amount")
        metadata = data.get("metadata", {})

        logger.info(
            "payment_succeeded",
            payment_intent_id=payment_intent_id,
            amount=amount,
            metadata=metadata,
        )

        # Handle credit purchases
        if metadata.get("type") == "credit_purchase":
            # Credits are added when payment succeeds
            pass

        return {
            "handled": True,
            "payment_intent_id": payment_intent_id,
            "amount": amount,
        }

    async def _handle_payment_failed(self, data: dict) -> dict:
        """Handle failed payment"""
        payment_intent_id = data.get("id")
        error = data.get("last_payment_error", {})

        logger.warning(
            "payment_failed",
            payment_intent_id=payment_intent_id,
            error=error.get("message"),
        )

        return {
            "handled": True,
            "payment_intent_id": payment_intent_id,
            "error": error.get("message"),
        }

    # ─── Customer ─────────────────────────────────────────────────────────

    async def _handle_customer_created(self, data: dict) -> dict:
        """Handle new customer"""
        customer_id = data.get("id")
        email = data.get("email")
        organization_id = data.get("metadata", {}).get("organization_id")

        logger.info(
            "customer_created",
            customer_id=customer_id,
            organization_id=organization_id,
            email=email,
        )

        # Link customer to organization in database
        if organization_id:
            self._db.table("organizations").update(
                {
                    "stripe_customer_id": customer_id,
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", organization_id).execute()

        return {
            "handled": True,
            "customer_id": customer_id,
            "organization_id": organization_id,
        }

    async def _handle_customer_updated(self, data: dict) -> dict:
        """Handle customer update"""
        customer_id = data.get("id")
        logger.info("customer_updated", customer_id=customer_id)
        return {"handled": True, "customer_id": customer_id}

    async def _handle_customer_deleted(self, data: dict) -> dict:
        """Handle customer deletion"""
        customer_id = data.get("id")
        logger.info("customer_deleted", customer_id=customer_id)

        # Unlink customer from organization
        self._db.table("organizations").update(
            {
                "stripe_customer_id": None,
                "stripe_subscription_id": None,
                "updated_at": datetime.now(UTC).isoformat(),
            }
        ).eq("stripe_customer_id", customer_id).execute()

        return {"handled": True, "customer_id": customer_id}
