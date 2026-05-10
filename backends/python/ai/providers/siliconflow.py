"""
SiliconFlow Provider Implementation

Uses OpenAI SDK with SiliconFlow base URL for compatibility.
Supports: Chat, Embeddings, Reranking, Image Generation
"""

import os
from collections.abc import AsyncGenerator

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
    RerankRequest,
    RerankResponse,
    RerankResult,
)

# ============================================
# SiliconFlow Constants
# ============================================

SILICONFLOW_BASE_URL_CN = "https://api.siliconflow.cn/v1"
SILICONFLOW_BASE_URL_INTL = "https://api.siliconflow.com/v1"

SILICONFLOW_MODELS: list[ModelInfo] = [
    # Chat Models - DeepSeek
    ModelInfo(
        id="deepseek-ai/DeepSeek-V3",
        name="DeepSeek V3",
        description="Latest DeepSeek model with strong reasoning",
        capabilities=["chat", "chat-stream", "function-calling"],
        context_window=164000,
        input_price_per_million=0.27,
        output_price_per_million=0.41,
    ),
    ModelInfo(
        id="deepseek-ai/DeepSeek-R1",
        name="DeepSeek R1",
        description="Reasoning-focused model with chain-of-thought",
        capabilities=["chat", "chat-stream", "reasoning"],
        context_window=164000,
        input_price_per_million=0.55,
        output_price_per_million=2.19,
    ),
    # Chat Models - Qwen
    ModelInfo(
        id="Qwen/QwQ-32B",
        name="Qwen QwQ-32B",
        description="Qwen reasoning model",
        capabilities=["chat", "chat-stream", "reasoning"],
        context_window=32768,
        input_price_per_million=1.26,
        output_price_per_million=1.26,
    ),
    ModelInfo(
        id="Qwen/Qwen2.5-Coder-32B-Instruct",
        name="Qwen2.5 Coder 32B",
        description="Code-specialized model",
        capabilities=["chat", "chat-stream", "function-calling"],
        context_window=32768,
        input_price_per_million=1.26,
        output_price_per_million=1.26,
    ),
    # Embedding Models
    ModelInfo(
        id="BAAI/bge-m3",
        name="BGE-M3",
        description="Multilingual embedding, 8192 tokens",
        capabilities=["embeddings"],
        context_window=8192,
        input_price_per_million=0.01,
    ),
    ModelInfo(
        id="BAAI/bge-large-en-v1.5",
        name="BGE Large EN v1.5",
        description="English embedding, 512 tokens",
        capabilities=["embeddings"],
        context_window=512,
        input_price_per_million=0.01,
    ),
    ModelInfo(
        id="BAAI/bge-large-zh-v1.5",
        name="BGE Large ZH v1.5",
        description="Chinese embedding, 512 tokens",
        capabilities=["embeddings"],
        context_window=512,
        input_price_per_million=0.01,
    ),
    # Rerank Models
    ModelInfo(
        id="BAAI/bge-reranker-v2-m3",
        name="BGE Reranker v2 M3",
        description="Multilingual document reranking",
        capabilities=["rerank"],
        input_price_per_million=0.1,
    ),
]


class SiliconFlowConfig(ProviderConfig):
    """SiliconFlow specific configuration"""

    use_international: bool = False


class SiliconFlowProvider(BaseProvider):
    """SiliconFlow AI Provider"""

    def __init__(self, config: SiliconFlowConfig | ProviderConfig):
        # Determine base URL
        use_intl = getattr(config, "use_international", False)
        if not config.base_url:
            config.base_url = (
                SILICONFLOW_BASE_URL_INTL if use_intl else SILICONFLOW_BASE_URL_CN
            )

        super().__init__(config)

        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=self.config.timeout,
            max_retries=self.config.max_retries,
        )

        self._capabilities = {
            "chat",
            "chat-stream",
            "embeddings",
            "rerank",
            "image-generation",
            "function-calling",
            "reasoning",
        }

    @property
    def name(self) -> str:
        return "siliconflow"

    @property
    def display_name(self) -> str:
        return "SiliconFlow"

    # ============================================
    # Chat Completions
    # ============================================

    async def chat(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Create a chat completion"""
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

        # Extract tool calls if present
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

        # Extract reasoning content for DeepSeek-R1
        reasoning_content = getattr(message, "reasoning_content", None)

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
            reasoning_content=reasoning_content,
        )

    async def chat_stream(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """Stream a chat completion"""
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

    # ============================================
    # Embeddings
    # ============================================

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Create embeddings for text"""
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

    # ============================================
    # Reranking
    # ============================================

    async def rerank(self, request: RerankRequest) -> RerankResponse:
        """Rerank documents by relevance to query"""
        async with httpx.AsyncClient(timeout=self.config.timeout) as client:
            response = await client.post(
                f"{self.config.base_url}/rerank",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.config.api_key}",
                },
                json={
                    "model": request.model,
                    "query": request.query,
                    "documents": request.documents,
                    "top_n": request.top_n,
                    "return_documents": request.return_documents,
                },
            )

            response.raise_for_status()
            data = response.json()

        results = [
            RerankResult(
                index=r["index"],
                relevance_score=r["relevance_score"],
                document=r.get("document"),
            )
            for r in data.get("results", [])
        ]

        return RerankResponse(
            model=data.get("model", request.model),
            results=results,
            usage={"total_tokens": data.get("usage", {}).get("total_tokens", 0)}
            if data.get("usage")
            else None,
        )

    # ============================================
    # Utility Methods
    # ============================================

    def get_available_models(self) -> list[ModelInfo]:
        return SILICONFLOW_MODELS

    def supports_capability(self, capability: str) -> bool:
        return capability in self._capabilities

    async def get_user_info(self) -> dict:
        """Get user account info including balance"""
        async with httpx.AsyncClient(timeout=self.config.timeout) as client:
            response = await client.get(
                f"{self.config.base_url}/user/info",
                headers={"Authorization": f"Bearer {self.config.api_key}"},
            )
            response.raise_for_status()
            data = response.json()

        return {
            "balance": data.get("data", {}).get("balance", 0),
            "status": data.get("data", {}).get("status", "unknown"),
        }


def create_siliconflow_provider(
    api_key: str | None = None,
    use_international: bool = False,
) -> SiliconFlowProvider:
    """Factory function to create SiliconFlow provider"""
    key = api_key or os.getenv("SILICONFLOW_API_KEY")
    if not key:
        raise ValueError("SILICONFLOW_API_KEY is required")

    config = SiliconFlowConfig(
        api_key=key,
        use_international=use_international,
    )
    return SiliconFlowProvider(config)
