"""
Product Hunt API data models.
Based on PH GraphQL API v2 schema.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ===========================================
# Core Models
# ===========================================


class PHUser(BaseModel):
    """Product Hunt User."""

    id: str
    name: str
    username: str
    headline: Optional[str] = None
    profile_image: Optional[str] = Field(None, alias="profileImage")
    twitter_username: Optional[str] = Field(None, alias="twitterUsername")
    website_url: Optional[str] = Field(None, alias="websiteUrl")
    followers_count: int = Field(0, alias="followersCount")

    class Config:
        populate_by_name = True


class PHTopic(BaseModel):
    """Product Hunt Topic/Category."""

    id: str
    name: str
    slug: str
    description: Optional[str] = None
    posts_count: int = Field(0, alias="postsCount")
    followers_count: int = Field(0, alias="followersCount")

    class Config:
        populate_by_name = True


class PHMedia(BaseModel):
    """Product Hunt Media (image/video)."""

    type: str  # "image" | "video"
    url: str
    video_url: Optional[str] = Field(None, alias="videoUrl")

    class Config:
        populate_by_name = True


class PHPost(BaseModel):
    """Product Hunt Post (Product)."""

    id: str
    name: str
    slug: str
    tagline: str
    description: Optional[str] = None
    url: str
    website: Optional[str] = None

    # Metrics
    votes_count: int = Field(0, alias="votesCount")
    comments_count: int = Field(0, alias="commentsCount")
    reviews_count: int = Field(0, alias="reviewsCount")
    reviews_rating: Optional[float] = Field(None, alias="reviewsRating")

    # Media
    thumbnail: Optional[PHMedia] = None
    media: list[PHMedia] = []

    # Relations
    topics: list[PHTopic] = []
    makers: list[PHUser] = []

    # Timestamps
    featured_at: Optional[datetime] = Field(None, alias="featuredAt")
    created_at: datetime = Field(alias="createdAt")

    # Product Hunt URLs
    @property
    def product_hunt_url(self) -> str:
        return f"https://www.producthunt.com/posts/{self.slug}"

    class Config:
        populate_by_name = True


class PHCollection(BaseModel):
    """Product Hunt Collection."""

    id: str
    name: str
    slug: str
    tagline: Optional[str] = None
    description: Optional[str] = None
    posts_count: int = Field(0, alias="postsCount")
    followers_count: int = Field(0, alias="followersCount")
    cover_image: Optional[str] = Field(None, alias="coverImage")
    user: Optional[PHUser] = None

    class Config:
        populate_by_name = True


class PHComment(BaseModel):
    """Product Hunt Comment."""

    id: str
    body: str
    votes_count: int = Field(0, alias="votesCount")
    user: PHUser
    created_at: datetime = Field(alias="createdAt")

    class Config:
        populate_by_name = True


# ===========================================
# Response Models
# ===========================================


class PHPageInfo(BaseModel):
    """Pagination info for GraphQL connections."""

    has_previous_page: bool = Field(False, alias="hasPreviousPage")
    has_next_page: bool = Field(False, alias="hasNextPage")
    start_cursor: Optional[str] = Field(None, alias="startCursor")
    end_cursor: Optional[str] = Field(None, alias="endCursor")

    class Config:
        populate_by_name = True


class PHPostEdge(BaseModel):
    """GraphQL edge for posts."""

    cursor: str
    node: PHPost


class PHPostsConnection(BaseModel):
    """GraphQL connection for posts."""

    edges: list[PHPostEdge] = []
    page_info: PHPageInfo = Field(alias="pageInfo")
    total_count: int = Field(0, alias="totalCount")

    class Config:
        populate_by_name = True


# ===========================================
# API Request/Response Models
# ===========================================


class PostsQueryParams(BaseModel):
    """Query parameters for fetching posts."""

    first: int = Field(20, ge=1, le=50, description="Number of posts to fetch")
    after: Optional[str] = Field(None, description="Cursor for pagination")
    topic: Optional[str] = Field(None, description="Filter by topic slug")
    order: str = Field(
        "VOTES", description="Sort order: VOTES, NEWEST, RANKING"
    )
    posted_after: Optional[datetime] = Field(
        None, alias="postedAfter", description="Filter posts after this date"
    )
    posted_before: Optional[datetime] = Field(
        None, alias="postedBefore", description="Filter posts before this date"
    )
    featured: Optional[bool] = Field(None, description="Filter featured only")

    class Config:
        populate_by_name = True


class TrendingPostsParams(BaseModel):
    """Parameters for trending posts."""

    first: int = Field(20, ge=1, le=50)
    topic: Optional[str] = None


class PostsResponse(BaseModel):
    """API response for posts list."""

    posts: list[PHPost]
    page_info: PHPageInfo
    total_count: int
    cached: bool = False
    cached_at: Optional[datetime] = None


class TopicsResponse(BaseModel):
    """API response for topics list."""

    topics: list[PHTopic]
    cached: bool = False
    cached_at: Optional[datetime] = None


class PostDetailResponse(BaseModel):
    """API response for single post."""

    post: PHPost
    cached: bool = False
    cached_at: Optional[datetime] = None
