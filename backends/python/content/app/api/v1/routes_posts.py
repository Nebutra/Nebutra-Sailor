from datetime import datetime

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter()


class CreatePostRequest(BaseModel):
    title: str
    body: str
    status: str = "draft"


class PostResponse(BaseModel):
    id: str
    organization_id: str
    author_id: str
    title: str
    body: str
    status: str
    created_at: datetime
    updated_at: datetime


# In-memory store for demo (replace with Supabase in production)
posts_db: dict[str, dict] = {}
post_counter = 0


@router.post("/", response_model=PostResponse)
async def create_post(
    request: CreatePostRequest,
    x_organization_id: str = Header(...),
    x_user_id: str = Header(...),
):
    """Create a new post"""
    global post_counter
    post_counter += 1
    post_id = f"post_{post_counter}"
    now = datetime.utcnow()

    post = {
        "id": post_id,
        "organization_id": x_organization_id,
        "author_id": x_user_id,
        "title": request.title,
        "body": request.body,
        "status": request.status,
        "created_at": now,
        "updated_at": now,
    }
    posts_db[post_id] = post
    return post


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    x_organization_id: str = Header(...),
):
    """Get a post by ID"""
    post = posts_db.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["organization_id"] != x_organization_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return post


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    request: CreatePostRequest,
    x_organization_id: str = Header(...),
):
    """Update a post"""
    post = posts_db.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["organization_id"] != x_organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    post.update(
        {
            "title": request.title,
            "body": request.body,
            "status": request.status,
            "updated_at": datetime.utcnow(),
        }
    )
    return post


@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    x_organization_id: str = Header(...),
):
    """Delete a post"""
    post = posts_db.get(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["organization_id"] != x_organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    del posts_db[post_id]
    return {"deleted": True}
