from fastapi import APIRouter, Header
from pydantic import BaseModel

router = APIRouter()


class Product(BaseModel):
    id: str
    title: str
    price: float
    inventory: int
    status: str


# Mock products
PRODUCTS = [
    {
        "id": "prod_1",
        "title": "Widget A",
        "price": 29.99,
        "inventory": 100,
        "status": "active",
    },
    {
        "id": "prod_2",
        "title": "Gadget B",
        "price": 49.99,
        "inventory": 50,
        "status": "active",
    },
    {
        "id": "prod_3",
        "title": "Tool C",
        "price": 19.99,
        "inventory": 200,
        "status": "active",
    },
]


@router.get("/")
async def list_products(
    x_organization_id: str = Header(...),
    limit: int = 20,
    category: str | None = None,
):
    """List products"""
    return {"products": PRODUCTS[:limit], "total": len(PRODUCTS)}


@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str, x_organization_id: str = Header(...)):
    """Get product by ID"""
    for p in PRODUCTS:
        if p["id"] == product_id:
            return p
    return {"error": "Not found"}


@router.post("/sync")
async def sync_products(
    x_organization_id: str = Header(...),
    source: str = "shopify",
):
    """Trigger product sync from Shopify/Shopline"""
    return {
        "status": "sync_initiated",
        "source": source,
        "message": "Product sync will run in background",
    }
