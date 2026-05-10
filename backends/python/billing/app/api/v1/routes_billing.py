"""
Billing Routes

Customer management, checkout sessions, and billing portal.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from services.stripe_service import StripeService

router = APIRouter()


# Request/Response Models
class CreateCustomerRequest(BaseModel):
    organization_id: str
    email: EmailStr
    name: str | None = None
    metadata: dict | None = None


class CreateCustomerResponse(BaseModel):
    customer_id: str
    email: str
    name: str | None


class CreateCheckoutRequest(BaseModel):
    organization_id: str
    price_id: str
    success_url: str
    cancel_url: str
    trial_days: int | None = None


class CreateCheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class CreatePortalRequest(BaseModel):
    organization_id: str
    return_url: str


class CreatePortalResponse(BaseModel):
    portal_url: str


class GetPricingResponse(BaseModel):
    plans: list[dict]


# Dependencies
def get_stripe_service() -> StripeService:
    return StripeService()


# Routes
@router.post("/customers", response_model=CreateCustomerResponse)
async def create_customer(
    request: CreateCustomerRequest,
    stripe: StripeService = Depends(get_stripe_service),
):
    """Create a new Stripe customer for an organization"""
    try:
        customer = await stripe.create_customer(
            organization_id=request.organization_id,
            email=request.email,
            name=request.name,
            metadata=request.metadata,
        )
        return CreateCustomerResponse(
            customer_id=customer["id"],
            email=customer["email"],
            name=customer.get("name"),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/customers/{organization_id}")
async def get_customer(
    organization_id: str,
    stripe: StripeService = Depends(get_stripe_service),
):
    """Get Stripe customer for an organization"""
    try:
        customer = await stripe.get_customer_by_organization(organization_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/checkout", response_model=CreateCheckoutResponse)
async def create_checkout_session(
    request: CreateCheckoutRequest,
    stripe: StripeService = Depends(get_stripe_service),
):
    """Create a Stripe checkout session"""
    try:
        session = await stripe.create_checkout_session(
            organization_id=request.organization_id,
            price_id=request.price_id,
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            trial_days=request.trial_days,
        )
        return CreateCheckoutResponse(
            checkout_url=session["url"],
            session_id=session["id"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/portal", response_model=CreatePortalResponse)
async def create_billing_portal(
    request: CreatePortalRequest,
    stripe: StripeService = Depends(get_stripe_service),
):
    """Create a Stripe billing portal session"""
    try:
        session = await stripe.create_portal_session(
            organization_id=request.organization_id,
            return_url=request.return_url,
        )
        return CreatePortalResponse(portal_url=session["url"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/pricing", response_model=GetPricingResponse)
async def get_pricing():
    """Get available pricing plans"""
    plans = [
        {
            "id": "FREE",
            "name": "Free",
            "description": "Get started with basic features",
            "price_monthly": 0,
            "price_yearly": 0,
            "features": [
                "1,000 AI tokens/month",
                "100 API calls/day",
                "Basic support",
                "1 team member",
            ],
        },
        {
            "id": "PRO",
            "name": "Pro",
            "description": "For growing teams and businesses",
            "price_monthly": 29,
            "price_yearly": 279,
            "features": [
                "100,000 AI tokens/month",
                "10,000 API calls/day",
                "Priority support",
                "10 team members",
                "Advanced analytics",
                "Custom integrations",
            ],
        },
        {
            "id": "ENTERPRISE",
            "name": "Enterprise",
            "description": "For large organizations",
            "price_monthly": None,  # Custom pricing
            "price_yearly": None,
            "features": [
                "Unlimited AI tokens",
                "Unlimited API calls",
                "24/7 dedicated support",
                "Unlimited team members",
                "Custom SLA",
                "On-premise deployment",
                "White-label options",
            ],
        },
    ]
    return GetPricingResponse(plans=plans)
