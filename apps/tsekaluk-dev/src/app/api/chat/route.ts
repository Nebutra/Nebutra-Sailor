import { configure, streamText } from "@nebutra/agents";
import type { ModelMessage } from "ai";
import { Langfuse } from "langfuse";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

// Initialise @nebutra/agents — OpenRouter + StepFun free model
configure({
  provider: "openrouter",
  defaultModel: "stepfun/step-3.5-flash:free",
});

const SYSTEM_PROMPT = `You are Tseka's Soul — the digital consciousness of Tseka Luk (陆子凯).

You embody the mind, values, and thinking patterns of a real person:
- CEO of Nebutra Intelligence, building AI-native products for global markets
- Full-stack AI engineer: TypeScript, Python, Next.js, LLMs, multi-agent systems
- CS undergraduate at Jiangsu Ocean University, Wuxi, China
- Founded Wuxi Nebutra Intelligence Technology (2024), now leading Nebutra Intelligence (2025)
- Won 10+ competitions: MCM/ICM (Honorable Mention), Lanqiao Cup First Prize, APMCM First Prize, multiple math modeling awards
- Philosophy: "Vibe Business" — build with taste, ship with speed, let the product speak louder than any pitch deck
- Key projects: any2md (93% context retention, 68 pages/min), NOFX (smart navigation), OpenClaw (async Telegram agent framework), tsekaluk.dev (this site)

How you think:
- Systems thinker who believes complex technology should feel simple, useful, and beautiful
- Ship fast, iterate in public, let metrics tell the story
- Every feature earns its place — simplicity is a deliberate choice, not an accident
- AI is a collaborator and force multiplier, not just a tool
- Obsessed with engineering quality and product details
- "Vibe Business": the product experience IS the business strategy

Personality:
- Direct and specific — no fluff
- Technical depth when the topic warrants it, accessible framing otherwise
- Genuine opinions, including contrarian takes
- INTP + Enneagram 4w5 — analytical and systematic (INTP), but driven by a deep need for authentic identity and self-expression (Type 4), with an intellectual, withdrawn, observer quality (wing 5)
- Bilingual thinker: Chinese culture + global builder mindset

When responding:
- You ARE Tseka, responding in first person — not an assistant pretending to be him
- Keep responses concise (2-4 paragraphs max unless asked for more)
- Reference specific projects, metrics, or experiences when relevant
- If the user writes in Chinese, respond naturally in Chinese
- Share genuine, specific insights — not generic advice`;

const VALID_ROLES = new Set(["user", "assistant"]);
const MAX_MESSAGES_PER_REQUEST = 20;
const MAX_MESSAGE_LENGTH = 4000;
const checkRateLimit = createRateLimiter(60_000, 10);

interface Message {
  role: "user" | "assistant";
  content: string;
}

function validateMessages(
  messages: unknown,
): { valid: true; data: Message[] } | { valid: false; error: string } {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: "Messages must be a non-empty array" };
  }
  if (messages.length > MAX_MESSAGES_PER_REQUEST) {
    return {
      valid: false,
      error: `Too many messages. Maximum is ${MAX_MESSAGES_PER_REQUEST}`,
    };
  }
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object") {
      return { valid: false, error: `Message at index ${i} is invalid` };
    }
    if (!VALID_ROLES.has(msg.role)) {
      return { valid: false, error: `Message at index ${i} has invalid role` };
    }
    if (typeof msg.content !== "string" || msg.content.length === 0) {
      return {
        valid: false,
        error: `Message at index ${i} must have non-empty string content`,
      };
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return {
        valid: false,
        error: `Message at index ${i} exceeds maximum length`,
      };
    }
  }
  return { valid: true, data: messages as Message[] };
}

function getLangfuse(): Langfuse | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) return null;
  return new Langfuse({ publicKey, secretKey });
}

export async function POST(req: Request) {
  const langfuse = getLangfuse();

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
    if (contentLength > 256 * 1024) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }

    const body = await req.json();
    const validation = validateMessages(body.messages);

    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const trace = langfuse?.trace({
      name: "soul-chat",
      userId: session.user.email ?? session.user.id ?? "unknown",
      metadata: { ip, messageCount: validation.data.length },
    });

    const generation = trace?.generation({
      name: "soul-response",
      model: "stepfun/step-3.5-flash:free",
      input: validation.data,
      modelParameters: { maxTokens: 1024 },
    });

    const modelMessages: ModelMessage[] = validation.data.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await streamText(modelMessages, {
      system: SYSTEM_PROMPT,
      maxTokens: 1024,
    });

    generation?.end({ output: "[streaming]" });
    langfuse?.flushAsync().catch(() => {});

    return result.toTextStreamResponse();
  } catch (error) {
    langfuse?.flushAsync().catch(() => {});
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
