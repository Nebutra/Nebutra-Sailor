import os

from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def create_embedding(
    text: str,
    model: str = "text-embedding-3-small",
) -> dict:
    """Create text embedding using OpenAI API"""

    response = await client.embeddings.create(
        model=model,
        input=text,
    )

    embedding = response.data[0].embedding

    return {
        "embedding": embedding,
        "model": model,
        "dimensions": len(embedding),
    }
