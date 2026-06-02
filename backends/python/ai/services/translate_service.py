import os

from providers.base import ChatCompletionRequest, ChatMessage
from providers.factory import get_default_provider

_DEFAULT_MODEL = os.environ.get("DEFAULT_MODEL", "Qwen/Qwen2.5-72B-Instruct")

LANGUAGE_NAMES = {
    "en": "English",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "pt": "Portuguese",
    "ar": "Arabic",
    "ru": "Russian",
}


async def translate_text(
    text: str,
    source: str = "en",
    target: str = "zh",
    model: str | None = None,
) -> dict:
    """Translate text using the configured AI provider (via provider abstraction layer).

    The default model is resolved from the ``DEFAULT_MODEL`` environment variable.
    The returned dict preserves the legacy ``translatedText`` key so that existing
    callers are not broken.
    """
    source_lang = LANGUAGE_NAMES.get(source, source)
    target_lang = LANGUAGE_NAMES.get(target, target)

    prompt = (
        f"Translate the following text from {source_lang} to {target_lang}. "
        f"Output only the translation, nothing else.\n\n{text}"
    )

    provider = get_default_provider()
    resolved_model = model or _DEFAULT_MODEL

    chat_req = ChatCompletionRequest(
        model=resolved_model,
        messages=[ChatMessage(role="user", content=prompt)],
        temperature=0.3,
    )

    resp = await provider.chat(chat_req)
    translated = (resp.content or text).strip()

    return {
        "translatedText": translated,
        "source": source,
        "target": target,
    }
