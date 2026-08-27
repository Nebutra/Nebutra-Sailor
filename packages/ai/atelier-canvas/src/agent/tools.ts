/**
 * The single agent tool that closes the loop: text prompt → generated asset
 * → server-placed on the tenant's canvas → patch handed back for broadcast.
 *
 * Generation reuses the env-key-gated modality in `@nebutra/agents` (mock when
 * no provider key is present). Placement + persistence reuse this package's
 * own engine (relative imports — same capability, no cross-package hop).
 *
 * `onPlaced` lets the app broadcast the patch (e.g. via pusher) WITHOUT this
 * package taking a realtime dependency — broadcast is a WRAP at the app layer.
 */

import {
  type AgentTool,
  type GenerationContext,
  generateImage,
  generateVideo,
} from "@nebutra/agents";
import { placeGeneratedAsset } from "../service";
import type { CanvasStore, ScenePatch } from "../types";

export interface AtelierToolDeps {
  /** Tenant-scoped persistence (InMemory for demo, Prisma in prod). */
  readonly store: CanvasStore;
  /** Broadcast hook — invoked after the patch is durably persisted. */
  readonly onPlaced?: (patch: ScenePatch) => void | Promise<void>;
}

interface GenerateInput {
  canvasId: string;
  prompt: string;
  modality?: "image" | "video";
  width?: number;
  height?: number;
  inputImages?: string[];
  durationSeconds?: number;
}

function parseInput(raw: unknown): GenerateInput {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (typeof o.canvasId !== "string" || o.canvasId.length === 0) {
    throw new Error("atelier_generate: 'canvasId' is required");
  }
  if (typeof o.prompt !== "string" || o.prompt.trim().length === 0) {
    throw new Error("atelier_generate: 'prompt' is required");
  }
  const modality = o.modality === "video" ? "video" : "image";
  return {
    canvasId: o.canvasId,
    prompt: o.prompt,
    modality,
    ...(typeof o.width === "number" ? { width: o.width } : {}),
    ...(typeof o.height === "number" ? { height: o.height } : {}),
    ...(Array.isArray(o.inputImages)
      ? { inputImages: o.inputImages.filter((x): x is string => typeof x === "string") }
      : {}),
    ...(typeof o.durationSeconds === "number" ? { durationSeconds: o.durationSeconds } : {}),
  };
}

/**
 * Build the `atelier_generate` tool. One call = one asset (the agent loops
 * itself for batches, per the batching rule in the system prompt).
 */
export function createAtelierGenerationTool(deps: AtelierToolDeps): AgentTool {
  return {
    name: "atelier_generate",
    description:
      "Generate one image or video from a prompt and place it on the canvas. " +
      "Returns the placed element's position so you can reason about layout. " +
      "Call once per asset; for batches, call repeatedly.",
    inputSchema: {
      type: "object",
      properties: {
        canvasId: { type: "string", description: "Target canvas id" },
        prompt: { type: "string", description: "Detailed generation prompt" },
        modality: { type: "string", enum: ["image", "video"] },
        width: { type: "number" },
        height: { type: "number" },
        durationSeconds: { type: "number", description: "Video length (s)" },
        inputImages: {
          type: "array",
          items: { type: "string" },
          description: "Reference file ids / URLs for edits & variations",
        },
      },
      required: ["canvasId", "prompt"],
    },
    execute: async (rawInput, context) => {
      const input = parseInput(rawInput);
      const genCtx: GenerationContext = {
        tenantId: context.tenantId,
        userId: context.userId,
        conversationId: context.conversationId,
      };

      const result =
        input.modality === "video"
          ? await generateVideo(
              {
                prompt: input.prompt,
                ...(input.width ? { width: input.width } : {}),
                ...(input.height ? { height: input.height } : {}),
                ...(input.durationSeconds ? { durationSeconds: input.durationSeconds } : {}),
                ...(input.inputImages?.[0] ? { inputImage: input.inputImages[0] } : {}),
              },
              genCtx,
            )
          : await generateImage(
              {
                prompt: input.prompt,
                ...(input.width ? { width: input.width } : {}),
                ...(input.height ? { height: input.height } : {}),
                ...(input.inputImages ? { inputImages: input.inputImages } : {}),
              },
              genCtx,
            );

      const { patch } = await placeGeneratedAsset(deps.store, context.tenantId, input.canvasId, {
        modality: result.modality,
        mimeType: result.mimeType,
        url: result.url,
        width: result.width,
        height: result.height,
        meta: {
          prompt: input.prompt,
          model: result.model,
          provider: result.providerName,
        },
      });

      // Persisted — now safe to broadcast.
      await deps.onPlaced?.(patch);

      return {
        ok: true,
        placed: {
          elementId: patch.element.id,
          x: patch.element.x,
          y: patch.element.y,
          modality: result.modality,
        },
        provider: result.providerName,
        model: result.model,
      };
    },
  };
}
