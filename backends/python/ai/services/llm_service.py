import os

from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def generate_text(
    prompt: str,
    max_tokens: int = 1000,
    temperature: float = 0.7,
    model: str = "gpt-5.2",
) -> dict:
    """Generate text using OpenAI API"""

    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    )

    text = response.choices[0].message.content or ""
    tokens_used = response.usage.total_tokens if response.usage else 0

    return {
        "text": text,
        "model": model,
        "tokens_used": tokens_used,
    }
