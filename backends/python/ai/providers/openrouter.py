"""
OpenRouter Provider

Unified API gateway for 400+ AI models from multiple providers.
Supports provider routing, model fallbacks, and automatic failover.

https://openrouter.ai/docs
"""

from collections.abc import AsyncGenerator
from dataclasses import dataclass
from typing import Any, Literal

import httpx

from . import _litellm
from .base import (
    BaseProvider,
    ChatCompletionRequest,
    ChatCompletionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ModelInfo,
    ProviderConfig,
)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


@dataclass
class OpenRouterConfig(ProviderConfig):
    """Configuration for OpenRouter"""

    http_referer: str | None = None  # App URL for attribution
    app_title: str | None = None  # App name for attribution
    default_provider_preferences: dict[str, Any] | None = None


@dataclass
class ProviderPreferences:
    """Provider routing preferences"""

    allow_fallbacks: bool = True
    require_parameters: bool = False
    data_collection: Literal["deny", "allow"] | None = None
    sort: Literal["price", "throughput", "latency"] | None = None
    order: list[str] | None = None
    ignore: list[str] | None = None
    only: list[str] | None = None
    quantizations: list[str] | None = None


@dataclass
class OpenRouterChatRequest(ChatCompletionRequest):
    """Extended chat request with OpenRouter-specific options"""

    provider: dict[str, Any] | None = None
    models: list[str] | None = None  # Fallback models
    route: Literal["fallback"] | None = None
    transforms: list[str] | None = None


def _clone_with_model(
    request: ChatCompletionRequest, model: str
) -> ChatCompletionRequest:
    """Return a base ChatCompletionRequest with a re-routed model id.

    Immutable: the original request is left untouched. Only the base chat
    fields are carried over — OpenRouter-specific options are forwarded
    separately via ``extra_body``.
    """
    return ChatCompletionRequest(
        model=model,
        messages=request.messages,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        top_p=request.top_p,
        stream=request.stream,
        stop=request.stop,
        tools=request.tools,
        response_format=request.response_format,
    )


# ============================================
# OpenRouter Models (Popular Examples)
# ============================================

OPENROUTER_MODELS = [
    # OpenAI
    ModelInfo(
        id="openai/gpt-5.4",
        name="GPT-5.4",
        description="OpenAI's most capable multimodal model",
        capabilities=["chat", "stream", "function-calling", "vision", "reasoning"],
        context_window=1000000,
        input_price_per_million=2.5,
        output_price_per_million=15.0,
    ),
    ModelInfo(
        id="openai/gpt-5.2",
        name="GPT-5.2",
        description="Standard model for general use",
        capabilities=["chat", "stream", "function-calling", "vision"],
        context_window=128000,
        input_price_per_million=1.75,
        output_price_per_million=14.0,
    ),
    ModelInfo(
        id="openai/o3",
        name="OpenAI o3",
        description="Reasoning model with chain-of-thought",
        capabilities=["chat", "stream", "reasoning"],
        context_window=200000,
        input_price_per_million=2.0,
        output_price_per_million=8.0,
    ),
    # Anthropic
    ModelInfo(
        id="anthropic/claude-4.6-sonnet",
        name="Claude 4.6 Sonnet",
        description="Latest Claude model with excellent reasoning",
        capabilities=["chat", "stream", "function-calling", "vision", "reasoning"],
        context_window=1000000,
        input_price_per_million=3,
        output_price_per_million=15,
    ),
    ModelInfo(
        id="anthropic/claude-4.5-haiku",
        name="Claude 4.5 Haiku",
        description="Fast and efficient Claude 4.5 model",
        capabilities=["chat", "stream", "function-calling"],
        context_window=200000,
        input_price_per_million=0.8,
        output_price_per_million=4,
    ),
    # Google
    ModelInfo(
        id="google/gemini-3.1-flash",
        name="Gemini 3.1 Flash",
        description="Google's fast, efficient multimodal model",
        capabilities=["chat", "stream", "vision"],
        context_window=1000000,
        input_price_per_million=0.25,
        output_price_per_million=1.5,
    ),
    ModelInfo(
        id="google/gemini-3.1-pro",
        name="Gemini 3.1 Pro",
        description="Google's flagship model",
        capabilities=["chat", "stream", "function-calling", "vision"],
        context_window=2000000,
        input_price_per_million=2.0,
        output_price_per_million=12.0,
    ),
    # DeepSeek
    ModelInfo(
        id="deepseek/deepseek-r1",
        name="DeepSeek R1",
        description="Reasoning model with chain-of-thought",
        capabilities=["chat", "stream", "reasoning"],
        context_window=164000,
        input_price_per_million=0.55,
        output_price_per_million=2.19,
    ),
    ModelInfo(
        id="deepseek/deepseek-chat",
        name="DeepSeek Chat",
        description="DeepSeek's chat model (V3)",
        capabilities=["chat", "stream", "function-calling"],
        context_window=164000,
        input_price_per_million=0.14,
        output_price_per_million=0.28,
    ),
    # Meta
    ModelInfo(
        id="meta-llama/llama-4-scout",
        name="Llama 4 Scout (109B)",
        description="Meta's efficient MoE model",
        capabilities=["chat", "stream", "function-calling", "vision"],
        context_window=128000,
        input_price_per_million=0.4,
        output_price_per_million=0.4,
    ),
    ModelInfo(
        id="meta-llama/llama-4-maverick",
        name="Llama 4 Maverick (400B)",
        description="Meta's largest cutting-edge model",
        capabilities=["chat", "stream", "function-calling", "vision"],
        context_window=128000,
        input_price_per_million=2.0,
        output_price_per_million=2.0,
    ),
    # xAI
    ModelInfo(
        id="x-ai/grok-4.1-fast",
        name="Grok 4.1 Fast",
        description="xAI's flagship fast reasoning model",
        capabilities=["chat", "stream", "function-calling", "reasoning"],
        context_window=2000000,
        input_price_per_million=2.0,
        output_price_per_million=10.0,
    ),
    ModelInfo(
        id="x-ai/grok-3",
        name="Grok 3",
        description="xAI's versatile enterprise model",
        capabilities=["chat", "stream", "function-calling"],
        context_window=128000,
        input_price_per_million=2.5,
        output_price_per_million=10.0,
    ),
    # Mistral
    ModelInfo(
        id="mistralai/mistral-large-2411",
        name="Mistral Large",
        description="Mistral's flagship model",
        capabilities=["chat", "stream", "function-calling"],
        context_window=128000,
        input_price_per_million=2,
        output_price_per_million=6,
    ),
    # Qwen
    ModelInfo(
        id="qwen/qwq-32b",
        name="Qwen QwQ 32B",
        description="Qwen's reasoning model",
        capabilities=["chat", "stream", "reasoning"],
        context_window=32768,
        input_price_per_million=0.12,
        output_price_per_million=0.18,
    ),
    # Auto
    ModelInfo(
        id="openrouter/auto",
        name="OpenRouter Auto",
        description="Auto-select best model for the task",
        capabilities=["chat", "stream"],
        context_window=128000,
    ),
]


# Model Variants
OPENROUTER_VARIANTS = {
    "NITRO": ":nitro",  # Fastest provider
    "FLOOR": ":floor",  # Cheapest provider
    "EXACTO": ":exacto",  # Better tool-calling accuracy
    "EXTENDED": ":extended",  # Extended context
    "FREE": ":free",  # Free tier (rate limited)
}


class OpenRouterProvider(BaseProvider):
    """OpenRouter unified API provider"""

    config: OpenRouterConfig

    def __init__(self, config: OpenRouterConfig):
        super().__init__(config)

        self.base_url = config.base_url or OPENROUTER_BASE_URL

        # Build default headers for attribution (HTTP-Referer / X-Title)
        default_headers: dict[str, str] = {}
        if config.http_referer:
            default_headers["HTTP-Referer"] = config.http_referer
        if config.app_title:
            default_headers["X-Title"] = config.app_title
        self._attribution_headers = default_headers

        # Chat + streaming go through litellm's openrouter route. The httpx
        # client is retained only for embeddings (proxied) and the
        # OpenRouter-specific management APIs below.
        self.http_client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {config.api_key}",
                **default_headers,
            },
            timeout=config.timeout,
        )

        self.default_preferences = config.default_provider_preferences
        self._capabilities = {
            "chat",
            "stream",
            "function-calling",
            "vision",
            "reasoning",
        }

    @property
    def name(self) -> str:
        return "openrouter"

    @property
    def display_name(self) -> str:
        return "OpenRouter"

    # ============================================
    # Chat Completions
    # ============================================

    def _routed_model(self, request: ChatCompletionRequest) -> str:
        """Prefix the model id with litellm's ``openrouter/`` route.

        OpenRouter model ids are vendor-namespaced (``anthropic/claude-...``);
        the ``openrouter/`` prefix tells litellm to dispatch through the
        OpenRouter gateway (base_url) rather than the underlying vendor.
        """
        model = request.model
        return model if model.startswith("openrouter/") else f"openrouter/{model}"

    def _extra_body(
        self, request: ChatCompletionRequest, *, include_transforms: bool
    ) -> dict[str, Any]:
        """Build OpenRouter-specific request fields (provider routing, model
        fallbacks, transforms) forwarded verbatim into the request body."""
        extra: dict[str, Any] = {}
        if isinstance(request, OpenRouterChatRequest):
            if request.provider or self.default_preferences:
                extra["provider"] = {
                    **(self.default_preferences or {}),
                    **(request.provider or {}),
                }
            if request.models:
                extra["models"] = request.models
                extra["route"] = request.route or "fallback"
            if include_transforms and request.transforms:
                extra["transforms"] = request.transforms
        elif self.default_preferences:
            extra["provider"] = {**self.default_preferences}
        return extra

    async def chat(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Create a chat completion"""
        rerouted = _clone_with_model(request, self._routed_model(request))
        return await _litellm.chat_completion(
            rerouted,
            base_url=self.base_url,
            api_key=self.config.api_key,
            route_model=False,
            extra_headers=self._attribution_headers or None,
            extra_body=self._extra_body(request, include_transforms=True) or None,
        )

    async def chat_stream(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """Stream a chat completion"""
        rerouted = _clone_with_model(request, self._routed_model(request))
        async for delta in _litellm.chat_completion_stream(
            rerouted,
            base_url=self.base_url,
            api_key=self.config.api_key,
            route_model=False,
            extra_headers=self._attribution_headers or None,
            extra_body=self._extra_body(request, include_transforms=False) or None,
        ):
            yield delta

    async def chat_with_fallback(
        self,
        request: ChatCompletionRequest,
        fallback_models: list[str],
    ) -> ChatCompletionResponse:
        """Chat with automatic model fallbacks"""
        openrouter_request = OpenRouterChatRequest(
            model=request.model,
            messages=request.messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p,
            stream=request.stream,
            stop=request.stop,
            tools=request.tools,
            response_format=request.response_format,
            models=[request.model, *fallback_models],
            route="fallback",
        )
        return await self.chat(openrouter_request)

    # ============================================
    # Embeddings
    # ============================================

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Create embeddings via OpenRouter.

        OpenRouter's ``/embeddings`` endpoint is OpenAI wire-protocol compatible.
        Routing through litellm keeps the same error-handling, retry, and usage
        normalisation logic as every other provider in this package.
        """
        return await _litellm.embedding(
            request,
            api_base=self.base_url,
            api_key=self.config.api_key,
        )

    # ============================================
    # OpenRouter Specific APIs
    # ============================================

    async def list_models(self) -> list[dict[str, Any]]:
        """Get available models from OpenRouter API"""
        response = await self.http_client.get("/models")

        if response.status_code != 200:
            raise Exception(f"Failed to list models: {response.status_code}")

        return response.json()["data"]

    async def get_generation(self, generation_id: str) -> dict[str, Any]:
        """Get generation details by ID (token counts, costs)"""
        response = await self.http_client.get(f"/generation?id={generation_id}")

        if response.status_code != 200:
            raise Exception(f"Failed to get generation: {response.status_code}")

        return response.json()

    async def get_credits(self) -> dict[str, Any]:
        """Get account credits and usage"""
        response = await self.http_client.get("https://openrouter.ai/api/v1/auth/key")

        if response.status_code != 200:
            raise Exception(f"Failed to get credits: {response.status_code}")

        data = response.json()["data"]
        return {
            "credits": data.get("limit") or float("inf"),
            "usage": data.get("usage", 0),
        }

    async def get_rate_limits(self) -> dict[str, Any]:
        """Get rate limit status"""
        response = await self.http_client.get("https://openrouter.ai/api/v1/auth/key")

        if response.status_code != 200:
            raise Exception(f"Failed to get rate limits: {response.status_code}")

        return response.json()["data"]

    # ============================================
    # Utility Methods
    # ============================================

    def get_available_models(self) -> list[ModelInfo]:
        """Get list of popular models"""
        return OPENROUTER_MODELS

    def supports_capability(self, capability: str) -> bool:
        """Check if provider supports a capability"""
        return capability in self._capabilities

    @staticmethod
    def get_model_variant(model_id: str, variant: str) -> str:
        """Get model ID with variant suffix"""
        suffix = OPENROUTER_VARIANTS.get(variant, "")
        return f"{model_id}{suffix}"

    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()
