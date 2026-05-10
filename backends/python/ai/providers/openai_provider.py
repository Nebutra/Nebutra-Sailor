"""
OpenAI Provider Implementation
"""

import os
from collections.abc import AsyncGenerator

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

        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            organization=self.config.organization,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
            max_retries=self.config.max_retries,
        )

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
        messages = [
            {"role": m.role, "content": m.content, "name": m.name}
            for m in request.messages
        ]

        response = await self.client.chat.completions.create(
            model=request.model,
            messages=messages,  # type: ignore
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p,
            stop=request.stop,
            tools=request.tools,  # type: ignore
            response_format=request.response_format,  # type: ignore
            stream=False,
        )

        choice = response.choices[0]
        message = choice.message

        tool_calls = None
        if message.tool_calls:
            tool_calls = [
                {
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in message.tool_calls
            ]

        return ChatCompletionResponse(
            id=response.id,
            model=response.model,
            content=message.content,
            finish_reason=choice.finish_reason,
            usage={
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens
                if response.usage
                else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0,
            },
            tool_calls=tool_calls,
        )

    async def chat_stream(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        messages = [
            {"role": m.role, "content": m.content, "name": m.name}
            for m in request.messages
        ]

        stream = await self.client.chat.completions.create(
            model=request.model,
            messages=messages,  # type: ignore
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p,
            stop=request.stop,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        response = await self.client.embeddings.create(
            model=request.model,
            input=request.input,
            encoding_format=request.encoding_format,  # type: ignore
        )

        embeddings = [d.embedding for d in response.data]

        return EmbeddingResponse(
            model=response.model,
            embeddings=embeddings,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "total_tokens": response.usage.total_tokens,
            },
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
