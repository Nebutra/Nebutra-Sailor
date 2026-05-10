"""
Stripe Service

Low-level Stripe API interactions.
"""

import stripe

from app.config import settings


class StripeService:
    """Service for Stripe API operations"""

    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    async def create_customer(
        self,
        organization_id: str,
        email: str,
        name: str | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """Create a new Stripe customer"""
        customer_metadata = {"organization_id": organization_id}
        if metadata:
            customer_metadata.update(metadata)

        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata=customer_metadata,
        )
        return dict(customer)

    async def get_customer(self, customer_id: str) -> dict | None:
        """Get a Stripe customer by ID"""
        try:
            customer = stripe.Customer.retrieve(customer_id)
            return dict(customer)
        except stripe.InvalidRequestError:
            return None

    async def get_customer_by_organization(self, organization_id: str) -> dict | None:
        """Get Stripe customer by organization ID"""
        customers = stripe.Customer.search(
            query=f"metadata['organization_id']:'{organization_id}'",
            limit=1,
        )
        if customers.data:
            return dict(customers.data[0])
        return None

    async def update_customer(
        self,
        customer_id: str,
        email: str | None = None,
        name: str | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """Update a Stripe customer"""
        update_params = {}
        if email:
            update_params["email"] = email
        if name:
            update_params["name"] = name
        if metadata:
            update_params["metadata"] = metadata

        customer = stripe.Customer.modify(customer_id, **update_params)
        return dict(customer)

    async def delete_customer(self, customer_id: str) -> bool:
        """Delete a Stripe customer"""
        try:
            stripe.Customer.delete(customer_id)
            return True
        except stripe.InvalidRequestError:
            return False

    async def create_checkout_session(
        self,
        organization_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_days: int | None = None,
    ) -> dict:
        """Create a Stripe checkout session"""
        # Get or create customer
        customer = await self.get_customer_by_organization(organization_id)

        session_params = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "metadata": {"organization_id": organization_id},
        }

        if customer:
            session_params["customer"] = customer["id"]
        else:
            session_params["customer_creation"] = "always"

        if trial_days:
            session_params["subscription_data"] = {
                "trial_period_days": trial_days,
            }

        session = stripe.checkout.Session.create(**session_params)
        return dict(session)

    async def create_portal_session(
        self,
        organization_id: str,
        return_url: str,
    ) -> dict:
        """Create a Stripe billing portal session"""
        customer = await self.get_customer_by_organization(organization_id)
        if not customer:
            raise ValueError(f"No customer found for organization {organization_id}")

        session = stripe.billing_portal.Session.create(
            customer=customer["id"],
            return_url=return_url,
        )
        return dict(session)

    async def create_payment_intent(
        self,
        amount: int,  # In cents
        currency: str = "usd",
        customer_id: str | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """Create a payment intent for one-time payments"""
        intent_params = {
            "amount": amount,
            "currency": currency,
            "automatic_payment_methods": {"enabled": True},
        }
        if customer_id:
            intent_params["customer"] = customer_id
        if metadata:
            intent_params["metadata"] = metadata

        intent = stripe.PaymentIntent.create(**intent_params)
        return dict(intent)
