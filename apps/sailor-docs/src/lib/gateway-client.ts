"use client";

/**
 * Client-side helpers for the two gateway endpoints that replaced this
 * bundle's server routes when it moved to a pure static export
 * (backends/gateway/src/routes/docs/{chat,feedback}.ts). Both are called
 * cross-origin over `fetch` — this bundle has no server of its own.
 */

const GATEWAY_URL = (process.env.NEXT_PUBLIC_GATEWAY_URL ?? "").replace(/\/+$/, "");

/** Whether a gateway URL was baked into this build at all. */
export function isGatewayConfigured(): boolean {
  return GATEWAY_URL.length > 0;
}

function gatewayUrl(path: string): string {
  return `${GATEWAY_URL}/api/v1/docs${path}`;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatResult =
  | { configured: true; reply: string }
  | { configured: false; message: string };

/**
 * Ask the docs assistant. Returns `{ configured: false }` both when the
 * gateway URL was never baked into this build AND when the gateway answers
 * that way itself (no LLM provider key) — same UI treatment either way.
 */
export async function askDocsAssistant(messages: ChatMessage[]): Promise<ChatResult> {
  if (!isGatewayConfigured()) {
    return {
      configured: false,
      message: "The docs assistant is not configured on this deployment.",
    };
  }

  const res = await fetch(gatewayUrl("/chat"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    return { configured: false, message: "The docs assistant is temporarily unavailable." };
  }

  return (await res.json()) as ChatResult;
}
