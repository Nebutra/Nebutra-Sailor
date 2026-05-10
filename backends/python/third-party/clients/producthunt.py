"""
Product Hunt GraphQL API Client.

Handles authentication, rate limiting, retries, and GraphQL queries
for the Product Hunt API v2.

API Documentation: https://api.producthunt.com/v2/docs
"""

import logging
from datetime import datetime
from typing import Any, Optional

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from utils.config import get_settings

logger = logging.getLogger(__name__)


# ===========================================
# GraphQL Queries
# ===========================================

POSTS_QUERY = """
query GetPosts(
    $first: Int!,
    $after: String,
    $topic: String,
    $order: PostsOrder,
    $postedAfter: DateTime,
    $postedBefore: DateTime,
    $featured: Boolean
) {
    posts(
        first: $first,
        after: $after,
        topic: $topic,
        order: $order,
        postedAfter: $postedAfter,
        postedBefore: $postedBefore,
        featured: $featured
    ) {
        totalCount
        pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
        }
        edges {
            cursor
            node {
                id
                name
                slug
                tagline
                description
                url
                website
                votesCount
                commentsCount
                reviewsCount
                reviewsRating
                featuredAt
                createdAt
                thumbnail {
                    type
                    url
                    videoUrl
                }
                topics(first: 5) {
                    edges {
                        node {
                            id
                            name
                            slug
                        }
                    }
                }
                makers {
                    id
                    name
                    username
                    profileImage
                    headline
                }
            }
        }
    }
}
"""

POST_DETAIL_QUERY = """
query GetPost($slug: String!) {
    post(slug: $slug) {
        id
        name
        slug
        tagline
        description
        url
        website
        votesCount
        commentsCount
        reviewsCount
        reviewsRating
        featuredAt
        createdAt
        thumbnail {
            type
            url
            videoUrl
        }
        media {
            type
            url
            videoUrl
        }
        topics(first: 10) {
            edges {
                node {
                    id
                    name
                    slug
                    description
                }
            }
        }
        makers {
            id
            name
            username
            profileImage
            headline
            twitterUsername
            websiteUrl
        }
    }
}
"""

TOPICS_QUERY = """
query GetTopics($first: Int!, $order: TopicsOrder) {
    topics(first: $first, order: $order) {
        edges {
            node {
                id
                name
                slug
                description
                postsCount
                followersCount
            }
        }
    }
}
"""

COLLECTIONS_QUERY = """
query GetCollections($first: Int!) {
    collections(first: $first) {
        edges {
            node {
                id
                name
                slug
                tagline
                description
                postsCount
                followersCount
                coverImage
                user {
                    id
                    name
                    username
                    profileImage
                }
            }
        }
    }
}
"""

POST_COMMENTS_QUERY = """
query GetPostComments($slug: String!, $first: Int!, $after: String) {
    post(slug: $slug) {
        comments(first: $first, after: $after) {
            totalCount
            pageInfo {
                hasNextPage
                endCursor
            }
            edges {
                node {
                    id
                    body
                    votesCount
                    createdAt
                    user {
                        id
                        name
                        username
                        profileImage
                    }
                }
            }
        }
    }
}
"""


# ===========================================
# Client Implementation
# ===========================================


class ProductHuntClientError(Exception):
    """Base exception for Product Hunt client errors."""

    pass


class ProductHuntRateLimitError(ProductHuntClientError):
    """Rate limit exceeded."""

    pass


class ProductHuntAuthError(ProductHuntClientError):
    """Authentication error."""

    pass


class ProductHuntClient:
    """
    Product Hunt GraphQL API Client.

    Features:
    - Developer token authentication
    - Automatic retries with exponential backoff
    - Rate limit handling
    - Request logging

    Usage:
        client = ProductHuntClient()
        posts = await client.get_posts(first=20, topic="ai")
    """

    def __init__(self):
        self.settings = get_settings()
        self.api_url = self.settings.product_hunt_api_url
        self.token = self.settings.product_hunt_dev_token

        if not self.token:
            logger.warning(
                "PRODUCT_HUNT_DEV_TOKEN not set. API calls will fail."
            )

    def _get_headers(self) -> dict[str, str]:
        """Get request headers with authentication."""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
    )
    async def _execute_query(
        self,
        query: str,
        variables: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Execute a GraphQL query against the Product Hunt API.

        Args:
            query: GraphQL query string
            variables: Query variables

        Returns:
            GraphQL response data

        Raises:
            ProductHuntAuthError: Authentication failed
            ProductHuntRateLimitError: Rate limit exceeded
            ProductHuntClientError: Other API errors
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.api_url,
                headers=self._get_headers(),
                json={"query": query, "variables": variables or {}},
            )

            # Handle rate limiting
            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After", "60")
                logger.warning(f"PH API rate limited. Retry after {retry_after}s")
                raise ProductHuntRateLimitError(
                    f"Rate limit exceeded. Retry after {retry_after} seconds."
                )

            # Handle auth errors
            if response.status_code == 401:
                raise ProductHuntAuthError("Invalid or expired token.")

            # Handle other errors
            if response.status_code != 200:
                logger.error(
                    f"PH API error: {response.status_code} - {response.text}"
                )
                raise ProductHuntClientError(
                    f"API request failed: {response.status_code}"
                )

            data = response.json()

            # Check for GraphQL errors
            if "errors" in data:
                errors = data["errors"]
                logger.error(f"PH GraphQL errors: {errors}")
                raise ProductHuntClientError(f"GraphQL errors: {errors}")

            return data.get("data", {})

    # ===========================================
    # Public API Methods
    # ===========================================

    async def get_posts(
        self,
        first: int = 20,
        after: Optional[str] = None,
        topic: Optional[str] = None,
        order: str = "VOTES",
        posted_after: Optional[datetime] = None,
        posted_before: Optional[datetime] = None,
        featured: Optional[bool] = None,
    ) -> dict[str, Any]:
        """
        Fetch posts from Product Hunt.

        Args:
            first: Number of posts to fetch (max 50)
            after: Pagination cursor
            topic: Filter by topic slug
            order: Sort order (VOTES, NEWEST, RANKING)
            posted_after: Filter posts after this date
            posted_before: Filter posts before this date
            featured: Filter featured posts only

        Returns:
            Posts connection with edges and pageInfo
        """
        variables = {
            "first": min(first, 50),
            "after": after,
            "topic": topic,
            "order": order,
            "postedAfter": posted_after.isoformat() if posted_after else None,
            "postedBefore": posted_before.isoformat() if posted_before else None,
            "featured": featured,
        }

        # Remove None values
        variables = {k: v for k, v in variables.items() if v is not None}

        data = await self._execute_query(POSTS_QUERY, variables)
        return data.get("posts", {})

    async def get_post(self, slug: str) -> Optional[dict[str, Any]]:
        """
        Fetch a single post by slug.

        Args:
            slug: Post slug

        Returns:
            Post data or None if not found
        """
        data = await self._execute_query(POST_DETAIL_QUERY, {"slug": slug})
        return data.get("post")

    async def get_topics(
        self,
        first: int = 50,
        order: str = "FOLLOWERS_COUNT",
    ) -> list[dict[str, Any]]:
        """
        Fetch topics/categories.

        Args:
            first: Number of topics to fetch
            order: Sort order (FOLLOWERS_COUNT, NEWEST)

        Returns:
            List of topics
        """
        data = await self._execute_query(
            TOPICS_QUERY,
            {"first": first, "order": order},
        )

        topics_data = data.get("topics", {})
        edges = topics_data.get("edges", [])
        return [edge["node"] for edge in edges]

    async def get_collections(self, first: int = 20) -> list[dict[str, Any]]:
        """
        Fetch collections.

        Args:
            first: Number of collections to fetch

        Returns:
            List of collections
        """
        data = await self._execute_query(COLLECTIONS_QUERY, {"first": first})
        collections_data = data.get("collections", {})
        edges = collections_data.get("edges", [])
        return [edge["node"] for edge in edges]

    async def get_post_comments(
        self,
        slug: str,
        first: int = 20,
        after: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Fetch comments for a post.

        Args:
            slug: Post slug
            first: Number of comments to fetch
            after: Pagination cursor

        Returns:
            Comments connection
        """
        data = await self._execute_query(
            POST_COMMENTS_QUERY,
            {"slug": slug, "first": first, "after": after},
        )
        post = data.get("post", {})
        return post.get("comments", {})

    async def get_trending_posts(
        self,
        first: int = 20,
        topic: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """
        Get trending posts (today's featured, sorted by votes).

        Args:
            first: Number of posts
            topic: Optional topic filter

        Returns:
            List of trending posts
        """
        from datetime import timedelta

        # Get posts from the last 24 hours, sorted by votes
        now = datetime.utcnow()
        yesterday = now - timedelta(days=1)

        posts_data = await self.get_posts(
            first=first,
            topic=topic,
            order="VOTES",
            posted_after=yesterday,
            featured=True,
        )

        edges = posts_data.get("edges", [])
        return [edge["node"] for edge in edges]


# Global client instance
ph_client = ProductHuntClient()
