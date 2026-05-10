"""
Configuration module for Integrations Service.
Loads environment variables with validation.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service
    service_name: str = "third-party"
    service_port: int = 8007
    debug: bool = False

    # Redis
    upstash_redis_url: str = ""

    # Product Hunt
    product_hunt_dev_token: str = ""
    product_hunt_client_id: str = ""
    product_hunt_client_secret: str = ""
    product_hunt_redirect_uri: str = ""
    product_hunt_api_url: str = "https://api.producthunt.com/v2/api/graphql"

    # Cache TTL (seconds)
    ph_cache_ttl_posts: int = 3600  # 1 hour
    ph_cache_ttl_topics: int = 86400  # 24 hours
    ph_cache_ttl_collections: int = 86400  # 24 hours
    ph_cache_ttl_trending: int = 1800  # 30 minutes

    # Rate Limiting
    ph_rate_limit_requests: int = 100
    ph_rate_limit_window: int = 3600  # 1 hour

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
