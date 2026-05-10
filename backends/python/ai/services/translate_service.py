import os

from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

LANGUAGE_NAMES = {
    "en": "English",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
}


async def translate_text(
    text: str,
    source: str = "en",
    target: str = "zh",
) -> dict:
    """Translate text using OpenAI API"""

    source_lang = LANGUAGE_NAMES.get(source, source)
    target_lang = LANGUAGE_NAMES.get(target, target)

    prompt = f"""Translate the following text from {source_lang} to {target_lang}.
Only output the translation, nothing else.

Text to translate:
{text}"""

    response = await client.chat.completions.create(
        model="gpt-5.2",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    translated = response.choices[0].message.content or text

    return {
        "translatedText": translated.strip(),
        "source": source,
        "target": target,
    }
