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
from openai import AsyncOpenAI

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

    def __init__(self, config: OpenRouterConfig):
        self._config = config
        self._validate_api_key()

        base_url = config.base_url or OPENROUTER_BASE_URL

        # Build default headers for attribution
        default_headers = {}
        if config.http_referer:
            default_headers["HTTP-Referer"] = config.http_referer
        if config.app_title:
            default_headers["X-Title"] = config.app_title

        self.client = AsyncOpenAI(
            api_key=config.api_key,
            base_url=base_url,
            timeout=config.timeout,
            max_retries=config.max_retries,
            default_headers=default_headers,
        )

        self.http_client = httpx.AsyncClient(
            base_url=base_url,
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
    def config(self) -> OpenRouterConfig:
        return self._config

    @property
    def name(self) -> str:
        return "openrouter"

    @property
    def display_name(self) -> str:
        return "OpenRouter"

    # ============================================
    # Chat Completions
    # ============================================

    async def chat(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Create a chat completion"""
        openrouter_request = request

        body: dict[str, Any] = {
            "model": request.model,
            "messages": [
                {"role": m.role, "content": m.content, "name": m.name}
                for m in request.messages
            ],
            "stream": False,
        }

        if request.temperature is not None:
            body["temperature"] = request.temperature
        if request.max_tokens is not None:
            body["max_tokens"] = request.max_tokens
        if request.top_p is not None:
            body["top_p"] = request.top_p
        if request.stop:
            body["stop"] = request.stop
        if request.tools:
            body["tools"] = request.tools
        if request.response_format:
            body["response_format"] = request.response_format

        # OpenRouter-specific options
        if isinstance(openrouter_request, OpenRouterChatRequest):
            if openrouter_request.provider or self.default_preferences:
                body["provider"] = {
                    **(self.default_preferences or {}),
                    **(openrouter_request.provider or {}),
                }
            if openrouter_request.models:
                body["models"] = openrouter_request.models
                body["route"] = openrouter_request.route or "fallback"
            if openrouter_request.transforms:
                body["transforms"] = openrouter_request.transforms

        response = await self.client.chat.completions.create(**body)

        return ChatCompletionResponse(
            id=response.id,
            model=response.model,
            content=response.choices[0].message.content,
            finish_reason=response.choices[0].finish_reason,
            usage={
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens
                if response.usage
                else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            },
            tool_calls=[
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in (response.choices[0].message.tool_calls or [])
            ]
            if response.choices[0].message.tool_calls
            else None,
            # Handle reasoning content from models like o1/DeepSeek-R1
            reasoning_content=getattr(response.choices[0].message, "reasoning", None),
        )

    async def chat_stream(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """Stream a chat completion"""
        openrouter_request = request

        body: dict[str, Any] = {
            "model": request.model,
            "messages": [
                {"role": m.role, "content": m.content, "name": m.name}
                for m in request.messages
            ],
            "stream": True,
        }

        if request.temperature is not None:
            body["temperature"] = request.temperature
        if request.max_tokens is not None:
            body["max_tokens"] = request.max_tokens
        if request.top_p is not None:
            body["top_p"] = request.top_p
        if request.stop:
            body["stop"] = request.stop

        # OpenRouter-specific options
        if isinstance(openrouter_request, OpenRouterChatRequest):
            if openrouter_request.provider or self.default_preferences:
                body["provider"] = {
                    **(self.default_preferences or {}),
                    **(openrouter_request.provider or {}),
                }
            if openrouter_request.models:
                body["models"] = openrouter_request.models
                body["route"] = openrouter_request.route or "fallback"

        stream = await self.client.chat.completions.create(**body)

        async for chunk in stream:
            # Skip OpenRouter comment payloads
            if chunk.id == "":
                continue
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

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
        """Create embeddings (proxied through OpenRouter)"""
        response = await self.http_client.post(
            "/embeddings",
            json={
                "model": request.model,
                "input": request.input,
                "encoding_format": request.encoding_format,
            },
        )

        if response.status_code != 200:
            raise Exception(
                f"OpenRouter embeddings error: {response.status_code} {response.text}"
            )

        data = response.json()

        return EmbeddingResponse(
            model=data["model"],
            embeddings=[d["embedding"] for d in data["data"]],
            usage={
                "prompt_tokens": data["usage"]["prompt_tokens"],
                "total_tokens": data["usage"]["total_tokens"],
            },
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
