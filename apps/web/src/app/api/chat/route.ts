import { streamText } from "@nebutra/ai-sdk";
import { convertToModelMessages } from "ai";
import { getAuth } from "@/lib/auth";

const AI_CONFIGURED =
  !!process.env.OPENROUTER_API_KEY ||
  !!process.env.OPENAI_API_KEY ||
  !!process.env.SILICONFLOW_API_KEY;

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!AI_CONFIGURED) {
    return Response.json(
      { error: "AI chat is not configured. Set an AI provider API key to enable." },
      { status: 503 },
    );
  }

  const { messages } = await req.json();

  try {
    const result = await streamText(await convertToModelMessages(messages), {
      model: "fast",
      system:
        "You are Sailor, Nebutra's AI assistant. You help users manage their SaaS platform, answer questions about their data, and provide guidance on features. Be concise, helpful, and professional.",
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    process.stderr.write(`[chat] Error: ${err instanceof Error ? err.message : String(err)}\n`);
    return Response.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 },
    );
  }
}
