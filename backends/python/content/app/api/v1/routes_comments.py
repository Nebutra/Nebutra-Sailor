from datetime import datetime

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter()


class CreateCommentRequest(BaseModel):
    post_id: str
    body: str


class CommentResponse(BaseModel):
    id: str
    post_id: str
    author_id: str
    body: str
    created_at: datetime


comments_db: dict[str, dict] = {}
comment_counter = 0


@router.post("/", response_model=CommentResponse)
async def create_comment(
    request: CreateCommentRequest,
    x_user_id: str = Header(...),
):
    """Create a comment on a post"""
    global comment_counter
    comment_counter += 1
    comment_id = f"comment_{comment_counter}"

    comment = {
        "id": comment_id,
        "post_id": request.post_id,
        "author_id": x_user_id,
        "body": request.body,
        "created_at": datetime.utcnow(),
    }
    comments_db[comment_id] = comment
    return comment


@router.get("/post/{post_id}")
async def get_comments_for_post(post_id: str, limit: int = 50):
    """Get comments for a post"""
    post_comments = [c for c in comments_db.values() if c["post_id"] == post_id]
    post_comments.sort(key=lambda x: x["created_at"])
    return {"comments": post_comments[:limit]}


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: str,
    x_user_id: str = Header(...),
):
    """Delete a comment (only by author)"""
    comment = comments_db.get(comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment["author_id"] != x_user_id:
        raise HTTPException(status_code=403, detail="Not your comment")

    del comments_db[comment_id]
    return {"deleted": True}
