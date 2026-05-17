/**
 * POST /api/atelier/generate
 *
 * Flag-gated. Runs the `atelier_generate` tool directly against the demo
 * store: generate (mock provider — no LLM/provider key needed) → server-place
 * → persist → return the patch. The full LLM agent loop is an additive WRAP
 * (BaseAgent + a provider key); the tool is exercised directly here so the
 * placement loop is verifiable end-to-end without external credentials.
 *
 * Realtime: production broadcasts the patch via pusher's `broadcastToTenant`
 * inside `onPlaced`; the demo returns the patch in the response and the client
 * applies it optimistically. Either way the scene is durable BEFORE the client
 * is told — the consistency invariant holds.
 */

import { createAgentContext } from "@nebutra/agents";
import type { ScenePatch } from "@nebutra/atelier-canvas";
import { createAtelierGenerationTool } from "@nebutra/atelier-canvas/agent";
import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { logger } from "@nebutra/logger";
import { atelierStore } from "@/lib/atelier/store";
import { getAuth, getTenantContext } from "@/lib/auth";

// Per-request tool: `onPlaced` captures the patch the engine persisted, so
// the response carries the durable asset (production would instead broadcast
// it via pusher and the client would apply it from the realtime channel).
function buildTool(sink: { patch?: ScenePatch }) {
  return createAtelierGenerationTool({
    store: atelierStore,
    onPlaced: (patch) => {
      sink.patch = patch;
    },
  });
}

export async function POST(req: Request) {
  const { userId } = await getAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tenantId, plan } = await getTenantContext();
  if (!tenantId) return new Response("No active organization", { status: 403 });

  const enabled = await isFeatureEnabled(FLAGS.ATELIER_CANVAS, {
    userId,
    tenantId,
    plan: (plan?.toLowerCase() || "free") as "free" | "pro" | "enterprise",
  });
  if (!enabled) return new Response("Not found", { status: 404 });

  let body: { canvasId?: string; prompt?: string; modality?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const ctx = createAgentContext(tenantId, userId, body.canvasId ?? "demo");
    const sink: { patch?: ScenePatch } = {};
    const summary = await buildTool(sink).execute(
      {
        canvasId: body.canvasId ?? "demo",
        prompt: body.prompt,
        modality: body.modality === "video" ? "video" : "image",
      },
      ctx,
    );
    return Response.json({ success: true, data: { summary, patch: sink.patch } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    logger.error("[atelier] generation failed", {
      tenantId,
      userId,
      canvasId: body.canvasId ?? "demo",
      error: message,
    });
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
