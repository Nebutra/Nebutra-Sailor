"""
Base provider interface for AI services
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProviderConfig:
    """Configuration for AI providers"""

    api_key: str
    base_url: str | None = None
    organization: str | None = None
    default_model: str | None = None
    timeout: int = 60
    max_retries: int = 3


@dataclass
class ChatMessage:
    """Chat message structure"""

    role: str  # "system", "user", "assistant", "tool"
    content: str
    name: str | None = None
    tool_call_id: str | None = None


@dataclass
class ChatCompletionRequest:
    """Request for chat completion"""

    model: str
    messages: list[ChatMessage]
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None
    stream: bool = False
    stop: list[str] | None = None
    tools: list[dict[str, Any]] | None = None
    response_format: dict[str, str] | None = None


@dataclass
class ChatCompletionResponse:
    """Response from chat completion"""

    id: str
    model: str
    content: str | None
    finish_reason: str | None
    usage: dict[str, int]
    tool_calls: list[dict[str, Any]] | None = None
    reasoning_content: str | None = None  # For DeepSeek-R1


@dataclass
class EmbeddingRequest:
    """Request for embeddings"""

    model: str
    input: str | list[str]
    encoding_format: str | None = None


@dataclass
class EmbeddingResponse:
    """Response from embeddings"""

    model: str
    embeddings: list[list[float]]
    usage: dict[str, int]


@dataclass
class RerankRequest:
    """Request for document reranking"""

    model: str
    query: str
    documents: list[str] | list[dict[str, Any]]
    top_n: int | None = None
    return_documents: bool = False


@dataclass
class RerankResult:
    """Single rerank result"""

    index: int
    relevance_score: float
    document: dict[str, Any] | None = None


@dataclass
class RerankResponse:
    """Response from reranking"""

    model: str
    results: list[RerankResult]
    usage: dict[str, int] | None = None


@dataclass
class ModelInfo:
    """Information about a model"""

    id: str
    name: str
    description: str | None = None
    capabilities: list[str] = field(default_factory=list)
    context_window: int | None = None
    input_price_per_million: float | None = None
    output_price_per_million: float | None = None


class BaseProvider(ABC):
    """Abstract base class for AI providers"""

    def __init__(self, config: ProviderConfig):
        self.config = config
        self._validate_api_key()

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identifier"""
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable provider name"""
        pass

    def _validate_api_key(self) -> None:
        """Validate API key is present"""
        if not self.config.api_key or not self.config.api_key.strip():
            raise ValueError(f"API key is required for {self.name}")

    # ============================================
    # Required Methods
    # ============================================

    @abstractmethod
    async def chat(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Create a chat completion"""
        pass

    @abstractmethod
    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Create embeddings for text"""
        pass

    # ============================================
    # Optional Methods
    # ============================================

    async def chat_stream(
        self, request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """Stream a chat completion"""
        raise NotImplementedError(f"Streaming not supported by {self.name}")
        yield  # Make it a generator

    async def rerank(self, request: RerankRequest) -> RerankResponse:
        """Rerank documents by relevance"""
        raise NotImplementedError(f"Reranking not supported by {self.name}")

    # ============================================
    # Utility Methods
    # ============================================

    @abstractmethod
    def get_available_models(self) -> list[ModelInfo]:
        """Get list of available models"""
        pass

    def supports_capability(self, capability: str) -> bool:
        """Check if provider supports a capability"""
        return False
