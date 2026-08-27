/**
 * POST /api/reel/run
 *
 * Flag-gated. Demonstrates the absorbed product form end-to-end with zero
 * external credentials: a script is split into shots, each shot becomes a
 * gen-image node whose mock-generated output is wrapped in a
 * NODE_IO_ENVELOPE v1.0 and persisted (per-node, under the canvas lock,
 * before the response is returned).
 *
 * Production injects `@nebutra/agents` generateText as the split `complete`
 * fn and a real generation provider; nothing else changes. The realtime
 * broadcast is the same WRAP the atelier route uses (pusher broadcastToTenant
 * in `onPlaced`), omitted from the demo which returns the graph directly.
 */

import { createAgentContext, generateImage } from "@nebutra/agents";
import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { logger } from "@nebutra/logger";
import { applyNodeOutput, buildEnvelope, type ReelEdge, type ReelNode } from "@nebutra/reel";
import { splitScriptIntoShots } from "@nebutra/reel/storyboard";
import { getAuth, getTenantContext } from "@/lib/auth";
import { reelStore } from "@/lib/reel/store";

const MAX_DEMO_SHOTS = 6;

/**
 * Keyless demo splitter: one shot per non-empty line. Production injects
 * `@nebutra/agents` generateText here (the prompt contract is unchanged).
 */
async function demoComplete(_system: string, user: string): Promise<string> {
  const lines = user
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_DEMO_SHOTS);
  return JSON.stringify(lines.map((prompt) => ({ prompt })));
}

export async function POST(req: Request) {
  const { userId } = await getAuth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tenantId, plan } = await getTenantContext();
  if (!tenantId) return new Response("No active organization", { status: 403 });

  const enabled = await isFeatureEnabled(FLAGS.REEL_STUDIO, {
    userId,
    tenantId,
    plan: (plan?.toLowerCase() || "free") as "free" | "pro" | "enterprise",
  });
  if (!enabled) return new Response("Not found", { status: 404 });

  let body: { graphId?: string; script?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const graphId = body.graphId ?? "demo";
  const script = (body.script ?? "").trim();
  if (!script) {
    return Response.json({ error: "script is required" }, { status: 400 });
  }

  try {
    const shots = await splitScriptIntoShots(script, demoComplete, {
      mode: "script",
    });

    const storyboardNode: ReelNode = {
      id: "storyboard",
      type: "storyboard",
      x: 0,
      y: 0,
      settings: { script, shotCount: shots.length },
    };
    const genNodes: ReelNode[] = shots.map((shot, i) => ({
      id: `gen-${i}`,
      type: "gen-image",
      x: 360,
      y: i * 240,
      settings: { prompt: shot.prompt, sceneIndex: shot.sceneIndex },
    }));
    const edges: ReelEdge[] = genNodes.map((n) => ({
      from: "storyboard",
      to: n.id,
      inputType: "prompt",
    }));

    await reelStore.create(tenantId, graphId, graphId);
    await reelStore.save(tenantId, graphId, [storyboardNode, ...genNodes], edges);

    const ctx = createAgentContext(tenantId, userId, graphId);
    for (let i = 0; i < genNodes.length; i++) {
      const shot = shots[i];
      const node = genNodes[i];
      if (!shot || !node) continue;
      const img = await generateImage({ prompt: shot.prompt, width: 768, height: 768 }, ctx);
      const envelope = buildEnvelope({
        sourceNodeId: node.id,
        sourceNodeType: "gen-image",
        inputType: "default",
        text: [shot.prompt],
        media: [{ type: "image", url: img.url }],
      });
      // Per-node, under the canvas lock, persisted before we continue.
      await applyNodeOutput(reelStore, tenantId, graphId, node.id, envelope);
    }

    const graph = await reelStore.get(tenantId, graphId);
    return Response.json({ success: true, data: { graph } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reel run failed";
    logger.error("[reel] run failed", { tenantId, userId, graphId, error: message });
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
