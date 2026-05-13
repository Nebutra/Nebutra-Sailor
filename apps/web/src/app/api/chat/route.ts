import { buildPersonalizedSystemPrompt, streamText, type UserContext } from "@nebutra/agents";
import { convertToModelMessages } from "ai";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";

const AI_CONFIGURED =
  !!process.env.OPENROUTER_API_KEY ||
  !!process.env.OPENAI_API_KEY ||
  !!process.env.SILICONFLOW_API_KEY;

const BASE_PROMPT =
  "You are Sailor, Nebutra's AI assistant. You help users manage their SaaS platform, answer questions about their data, and provide guidance on features. Be concise, helpful, and professional.";

async function loadUserContext(userId: string): Promise<UserContext | null> {
  try {
    return await db.userProfile.findUnique({
      where: { userId },
      select: {
        nickname: true,
        occupation: true,
        bio: true,
        customInstructions: true,
      },
    });
  } catch {
    // Personalization is a soft enhancement — never block chat on a profile
    // read failure (DB hiccup, schema migration in-flight, etc.).
    return null;
  }
}

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
    const userContext = await loadUserContext(auth.userId);
    const system = buildPersonalizedSystemPrompt(BASE_PROMPT, userContext);

    const result = await streamText(await convertToModelMessages(messages), {
      model: "fast",
      system,
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
