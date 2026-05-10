"""
Provider Factory

Create AI providers dynamically based on configuration
"""

import os
from typing import Literal

from .base import BaseProvider, ProviderConfig
from .openai_provider import OpenAIProvider
from .openrouter import OpenRouterConfig, OpenRouterProvider
from .siliconflow import SiliconFlowConfig, SiliconFlowProvider

ProviderName = Literal["siliconflow", "openai", "openrouter"]

_PROVIDER_REGISTRY: dict[str, type[BaseProvider]] = {
    "siliconflow": SiliconFlowProvider,
    "openai": OpenAIProvider,
    "openrouter": OpenRouterProvider,
}


def create_provider(
    name: ProviderName,
    api_key: str | None = None,
    **kwargs,
) -> BaseProvider:
    """
    Create a provider by name

    Args:
        name: Provider name ("siliconflow" or "openai")
        api_key: API key (optional, will use env var if not provided)
        **kwargs: Additional provider-specific configuration

    Returns:
        Provider instance

    Example:
        >>> provider = create_provider("siliconflow")
        >>> response = await provider.chat(request)
    """
    if name not in _PROVIDER_REGISTRY:
        available = ", ".join(_PROVIDER_REGISTRY.keys())
        raise ValueError(f"Unknown provider: {name}. Available: {available}")

    # Get API key from environment if not provided
    env_var_map = {
        "siliconflow": "SILICONFLOW_API_KEY",
        "openai": "OPENAI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
    }

    key = api_key or os.getenv(env_var_map.get(name, ""))
    if not key:
        raise ValueError(
            f"API key required for {name}. Set {env_var_map.get(name)} or pass api_key"
        )

    # Create provider-specific config
    if name == "siliconflow":
        config = SiliconFlowConfig(
            api_key=key,
            use_international=kwargs.get("use_international", False),
            base_url=kwargs.get("base_url"),
            timeout=kwargs.get("timeout", 60),
            max_retries=kwargs.get("max_retries", 3),
        )
    elif name == "openrouter":
        config = OpenRouterConfig(
            api_key=key,
            base_url=kwargs.get("base_url"),
            http_referer=kwargs.get("http_referer")
            or os.getenv("OPENROUTER_HTTP_REFERER"),
            app_title=kwargs.get("app_title") or os.getenv("OPENROUTER_APP_TITLE"),
            default_provider_preferences=kwargs.get("default_provider_preferences"),
            timeout=kwargs.get("timeout", 60),
            max_retries=kwargs.get("max_retries", 3),
        )
    else:
        config = ProviderConfig(
            api_key=key,
            base_url=kwargs.get("base_url"),
            organization=kwargs.get("organization"),
            timeout=kwargs.get("timeout", 60),
            max_retries=kwargs.get("max_retries", 3),
        )

    provider_class = _PROVIDER_REGISTRY[name]
    return provider_class(config)


def get_available_providers() -> list[str]:
    """Get list of available provider names"""
    return list(_PROVIDER_REGISTRY.keys())


def get_default_provider() -> BaseProvider:
    """
    Get the default provider based on environment configuration

    Priority:
    1. DEFAULT_AI_PROVIDER env var
    2. SiliconFlow if SILICONFLOW_API_KEY is set
    3. OpenAI if OPENAI_API_KEY is set
    """
    default = os.getenv("DEFAULT_AI_PROVIDER", "").lower()

    if default in _PROVIDER_REGISTRY:
        return create_provider(default)  # type: ignore

    # Fallback based on available keys
    if os.getenv("SILICONFLOW_API_KEY"):
        return create_provider("siliconflow")

    if os.getenv("OPENAI_API_KEY"):
        return create_provider("openai")

    if os.getenv("OPENROUTER_API_KEY"):
        return create_provider("openrouter")

    raise ValueError(
        "No AI provider configured. Set SILICONFLOW_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY"  # noqa: E501
    )
