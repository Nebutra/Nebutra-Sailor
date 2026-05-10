import logging

from fastapi import APIRouter, Request

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/shopify")
async def shopify_webhook(request: Request):
    """Handle Shopify webhooks"""
    await request.json()
    topic = request.headers.get("X-Shopify-Topic", "unknown")

    logger.info(f"Received Shopify webhook: {topic}")

    # Process based on topic
    if topic == "orders/create":
        # Handle new order
        pass
    elif topic == "products/update":
        # Handle product update
        pass
    elif topic == "inventory_levels/update":
        # Handle inventory change
        pass

    return {"received": True, "topic": topic}


@router.post("/shopline")
async def shopline_webhook(request: Request):
    """Handle Shopline webhooks"""
    body = await request.json()
    event_type = body.get("event_type", "unknown")

    logger.info(f"Received Shopline webhook: {event_type}")

    return {"received": True, "event_type": event_type}
