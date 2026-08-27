"""
AI Providers for Nebutra

Supports multiple AI providers with a unified interface:
- SiliconFlow (DeepSeek, Qwen, BGE embeddings, reranking)
- OpenAI (GPT-5, embeddings, DALL-E)
"""

from .base import BaseProvider, ProviderConfig
from .factory import create_provider, get_available_providers
from .openai_provider import OPENAI_MODELS, OpenAIProvider
from .siliconflow import SILICONFLOW_MODELS, SiliconFlowProvider

__all__ = [
    "OPENAI_MODELS",
    "SILICONFLOW_MODELS",
    "BaseProvider",
    "OpenAIProvider",
    "ProviderConfig",
    "SiliconFlowProvider",
    "create_provider",
    "get_available_providers",
]
