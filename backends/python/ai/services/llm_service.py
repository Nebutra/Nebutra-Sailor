import os

from providers.base import ChatCompletionRequest, ChatMessage
from providers.factory import get_default_provider

_DEFAULT_MODEL = os.environ.get("DEFAULT_MODEL", "Qwen/Qwen2.5-72B-Instruct")


async def generate_text(
    prompt: str,
    max_tokens: int = 1000,
    temperature: float = 0.7,
    model: str | None = None,
) -> dict:
    """Generate text using the configured AI provider (via provider abstraction layer).

    The default model is resolved from the ``DEFAULT_MODEL`` environment variable
    so that callers do not need to hard-code a vendor-specific model name.
    """
    provider = get_default_provider()
    resolved_model = model or _DEFAULT_MODEL

    chat_req = ChatCompletionRequest(
        model=resolved_model,
        messages=[ChatMessage(role="user", content=prompt)],
        max_tokens=max_tokens,
        temperature=temperature,
    )

    resp = await provider.chat(chat_req)

    return {
        "text": resp.content or "",
        "model": resp.model,
        "tokens_used": resp.usage.get("total_tokens", 0),
    }
