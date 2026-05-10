from datetime import datetime

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter()


class OrderItem(BaseModel):
    product_id: str
    quantity: int
    price: float


class Order(BaseModel):
    id: str
    status: str
    items: list[OrderItem]
    total: float
    created_at: datetime


orders_db: dict[str, dict] = {}
order_counter = 0


@router.get("/")
async def list_orders(x_organization_id: str = Header(...), limit: int = 20):
    """List orders for organization"""
    org_orders = [o for o in orders_db.values() if o.get("org_id") == x_organization_id]
    return {"orders": org_orders[:limit], "total": len(org_orders)}


@router.get("/{order_id}")
async def get_order(order_id: str, x_organization_id: str = Header(...)):
    """Get order by ID"""
    order = orders_db.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("org_id") != x_organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return order


@router.post("/")
async def create_order(
    items: list[OrderItem],
    x_organization_id: str = Header(...),
    x_user_id: str = Header(...),
):
    """Create a new order"""
    global order_counter
    order_counter += 1
    order_id = f"order_{order_counter}"

    total = sum(item.price * item.quantity for item in items)

    order = {
        "id": order_id,
        "org_id": x_organization_id,
        "user_id": x_user_id,
        "status": "pending",
        "items": [i.model_dump() for i in items],
        "total": total,
        "created_at": datetime.utcnow().isoformat(),
    }
    orders_db[order_id] = order
    return order
