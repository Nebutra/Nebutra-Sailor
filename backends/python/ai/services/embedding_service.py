import os

from providers.base import EmbeddingRequest
from providers.factory import get_default_provider

_DEFAULT_EMBEDDING_MODEL = os.environ.get("DEFAULT_EMBEDDING_MODEL", "BAAI/bge-m3")


async def create_embedding(
    text: str,
    model: str | None = None,
) -> dict:
    """Create a text embedding using the configured AI provider (via provider abstraction layer).

    The default model is resolved from the ``DEFAULT_EMBEDDING_MODEL`` environment
    variable so that callers do not need to hard-code a vendor-specific model name.
    """
    provider = get_default_provider()
    resolved_model = model or _DEFAULT_EMBEDDING_MODEL

    embed_req = EmbeddingRequest(model=resolved_model, input=text)
    resp = await provider.embed(embed_req)

    # embed() always returns at least one embedding for single-text input
    embedding = resp.embeddings[0]

    return {
        "embedding": embedding,
        "model": resp.model,
        "dimensions": len(embedding),
    }
