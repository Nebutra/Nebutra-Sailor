"""
OpenAI Provider Implementation

Wire protocol is delegated to litellm (openai-compatible route); this
module only carries OpenAI-specific configuration and model metadata.
"""

import os
from collections.abc import AsyncGenerator

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

OPENAI_MODELS: list[ModelInfo] = [
    ModelInfo(
        id="gpt-5.4",
        name="GPT-5.4",
        description="OpenAI's most capable model with vision",
        capabilities=["chat", "chat-stream", "function-calling", "vision", "reasoning"],
        context_window=1000000,
        input_price_per_million=2.5,
        output_price_per_million=15.0,
    ),
    ModelInfo(
        id="gpt-5.2",
        name="GPT-5.2",
        description="Standard model for general use",
        capabilities=["chat", "chat-stream", "function-calling", "vision"],
        context_window=128000,
        input_price_per_million=1.75,
        output_price_per_million=14.0,
    ),
    ModelInfo(
        id="o3",
        name="OpenAI o3",
        description="Reasoning model for complex tasks",
        capabilities=["chat", "reasoning"],
        context_window=200000,
        input_price_per_million=2.0,
        output_price_per_million=8.0,
    ),
    ModelInfo(
        id="text-embedding-3-small",
        name="Text Embedding 3 Small",
        description="Small embedding model",
        capabilities=["embeddings"],
        input_price_per_million=0.02,
    ),
    ModelInfo(
        id="text-embedding-3-large",
        name="Text Embedding 3 Large",
        description="Large embedding model",
        capabilities=["embeddings"],
        input_price_per_million=0.13,
    ),
]


class OpenAIProvider(BaseProvider):
    """OpenAI Provider"""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)

        self._capabilities = {
            "chat",
            "chat-stream",
            "embeddings",
            "image-generation",
            "text-to-speech",
            "speech-to-text",
            "function-calling",
            "vision",
        }

    @property
    def name(self) -> str:
        return "openai"

    @property
    def display_name(self) -> str:
        return "OpenAI"

    async def chat(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        return await _litellm.chat_completion(
            request,
            base_url=self.config.base_url,
            api_key=self.config.api_key,
        )

    async def chat_stream(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        async for delta in _litellm.chat_completion_stream(
            request,
            base_url=self.config.base_url,
            api_key=self.config.api_key,
        ):
            yield delta

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        return await _litellm.embedding(
            request,
            api_base=self.config.base_url,
            api_key=self.config.api_key,
        )

    def get_available_models(self) -> list[ModelInfo]:
        return OPENAI_MODELS

    def supports_capability(self, capability: str) -> bool:
        return capability in self._capabilities


def create_openai_provider(api_key: str | None = None) -> OpenAIProvider:
    """Factory function to create OpenAI provider"""
    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        raise ValueError("OPENAI_API_KEY is required")

    return OpenAIProvider(ProviderConfig(api_key=key))
