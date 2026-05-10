"""
Credits Service

Credit balance, transactions, and purchases.
"""

import uuid
from datetime import UTC, datetime

import stripe

from app.config import settings

from .stripe_service import StripeService

# Credits per dollar
CREDITS_PER_DOLLAR = 100


class CreditsService:
    """Service for credits management"""

    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.stripe_service = StripeService()
        # In production, use database
        self._balances: dict[str, int] = {}
        self._transactions: dict[str, list] = {}

    async def get_balance(self, organization_id: str) -> dict:
        """Get credit balance for an organization"""
        balance = self._balances.get(organization_id, 0)
        return {
            "organization_id": organization_id,
            "balance": balance,
            "dollar_value": balance / CREDITS_PER_DOLLAR,
            "last_updated": datetime.now(UTC),
        }

    async def purchase_credits(
        self,
        organization_id: str,
        amount_dollars: float,
        payment_method_id: str | None = None,
    ) -> dict:
        """Purchase credits"""
        credits_to_add = int(amount_dollars * CREDITS_PER_DOLLAR)
        amount_cents = int(amount_dollars * 100)

        # Get customer
        customer = await self.stripe_service.get_customer_by_organization(
            organization_id
        )
        customer_id = customer["id"] if customer else None

        # Create payment intent
        payment_intent = await self.stripe_service.create_payment_intent(
            amount=amount_cents,
            customer_id=customer_id,
            metadata={
                "organization_id": organization_id,
                "credits": str(credits_to_add),
                "type": "credit_purchase",
            },
        )

        # Add credits (in production, only after payment succeeds)
        transaction_id = await self._add_credits(
            organization_id=organization_id,
            credits=credits_to_add,
            transaction_type="PURCHASE",
            description=f"Purchased {credits_to_add} credits for ${amount_dollars}",
            metadata={"payment_intent_id": payment_intent["id"]},
        )

        new_balance = self._balances.get(organization_id, 0)

        return {
            "success": True,
            "credits_added": credits_to_add,
            "new_balance": new_balance,
            "transaction_id": transaction_id,
            "payment_intent_id": payment_intent["id"],
        }

    async def deduct_credits(
        self,
        organization_id: str,
        credits: int,
        reason: str,
        metadata: dict | None = None,
    ) -> dict:
        """Deduct credits from balance"""
        current_balance = self._balances.get(organization_id, 0)

        if current_balance < credits:
            raise ValueError(
                f"Insufficient credits. Balance: {current_balance}, Required: {credits}"
            )

        transaction_id = await self._add_credits(
            organization_id=organization_id,
            credits=-credits,
            transaction_type="USAGE",
            description=reason,
            metadata=metadata,
        )

        new_balance = self._balances.get(organization_id, 0)

        return {
            "success": True,
            "credits_deducted": credits,
            "new_balance": new_balance,
            "transaction_id": transaction_id,
        }

    async def has_enough_credits(self, organization_id: str, credits: int) -> bool:
        """Check if organization has enough credits"""
        balance = self._balances.get(organization_id, 0)
        return balance >= credits

    async def get_transactions(
        self,
        organization_id: str,
        transaction_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> dict:
        """Get credit transaction history"""
        all_transactions = self._transactions.get(organization_id, [])

        if transaction_type:
            filtered = [t for t in all_transactions if t["type"] == transaction_type]
        else:
            filtered = all_transactions

        paginated = filtered[offset : offset + limit]

        return {
            "organization_id": organization_id,
            "transactions": paginated,
            "total_count": len(filtered),
        }

    async def refund_credits(
        self,
        organization_id: str,
        transaction_id: str,
        credits: int | None = None,
        reason: str = "Refund",
    ) -> dict:
        """Refund credits"""
        # Find original transaction
        transactions = self._transactions.get(organization_id, [])
        original = next((t for t in transactions if t["id"] == transaction_id), None)

        if not original:
            raise ValueError(f"Transaction {transaction_id} not found")

        refund_amount = credits if credits else abs(original["credits"])

        new_transaction_id = await self._add_credits(
            organization_id=organization_id,
            credits=refund_amount,
            transaction_type="REFUND",
            description=f"Refund: {reason}",
            metadata={"original_transaction_id": transaction_id},
        )

        new_balance = self._balances.get(organization_id, 0)

        return {
            "success": True,
            "credits_deducted": -refund_amount,  # Negative because it's a refund
            "new_balance": new_balance,
            "transaction_id": new_transaction_id,
        }

    async def add_bonus(
        self,
        organization_id: str,
        credits: int,
        reason: str,
        expires_at: datetime | None = None,
    ) -> dict:
        """Add bonus credits"""
        transaction_id = await self._add_credits(
            organization_id=organization_id,
            credits=credits,
            transaction_type="BONUS",
            description=f"Bonus: {reason}",
            metadata={"expires_at": expires_at.isoformat() if expires_at else None},
        )

        new_balance = self._balances.get(organization_id, 0)

        return {
            "success": True,
            "credits_deducted": -credits,  # Negative because credits were added
            "new_balance": new_balance,
            "transaction_id": transaction_id,
        }

    async def _add_credits(
        self,
        organization_id: str,
        credits: int,
        transaction_type: str,
        description: str,
        metadata: dict | None = None,
    ) -> str:
        """Internal method to add/deduct credits and record transaction"""
        transaction_id = str(uuid.uuid4())

        # Update balance
        current = self._balances.get(organization_id, 0)
        new_balance = current + credits
        self._balances[organization_id] = new_balance

        # Record transaction
        if organization_id not in self._transactions:
            self._transactions[organization_id] = []

        self._transactions[organization_id].insert(
            0,
            {
                "id": transaction_id,
                "type": transaction_type,
                "credits": credits,
                "balance_after": new_balance,
                "description": description,
                "created_at": datetime.now(UTC),
                "metadata": metadata,
            },
        )

        return transaction_id
