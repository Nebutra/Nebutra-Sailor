"use client";

/**
 * Replaces `src/lib/github.ts` (deleted in dd792c5aa — a `"use server"`
 * action, which `output: "export"` cannot build). Same GitHub-Discussion
 * posting behaviour, now over `fetch` to
 * backends/gateway/src/routes/docs/feedback.ts. `onSendAction` in
 * `src/components/feedback/client.tsx` (never deleted) takes exactly this
 * shape, so the UI needed no changes beyond re-wiring which function it
 * calls — see mdx-components.tsx and `[[...slug]]/page.tsx`.
 */
import type { ActionResponse, BlockFeedback, PageFeedback } from "@/components/feedback/schema";
import { isGatewayConfigured } from "./gateway-client";

const GATEWAY_URL = (process.env.NEXT_PUBLIC_GATEWAY_URL ?? "").replace(/\/+$/, "");

async function postFeedback(body: unknown): Promise<ActionResponse> {
  if (!isGatewayConfigured()) return {};

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/docs/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { githubUrl?: string };
    return { githubUrl: data.githubUrl };
  } catch {
    return {};
  }
}

export async function onPageFeedbackAction(feedback: PageFeedback): Promise<ActionResponse> {
  return postFeedback({
    kind: "page",
    url: feedback.url,
    opinion: feedback.opinion,
    message: feedback.message,
  });
}

export async function onBlockFeedbackAction(feedback: BlockFeedback): Promise<ActionResponse> {
  return postFeedback({
    kind: "block",
    url: feedback.url,
    blockId: feedback.blockId,
    blockBody: feedback.blockBody,
    message: feedback.message,
  });
}
