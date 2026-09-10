/**
 * The tools a PARA agent turn can call, and the rule that decides which of them need a human.
 *
 * Every tool here is a first-party call against our own data — read the document, append a node,
 * submit a generation job. There is no untrusted code, which is why Carina's `ExternalSandbox`
 * stays unwired for PARA (ADR 2026-08-03: dock, do not replace).
 *
 * Tools take a plain context rather than a request: the runner executes them from a background
 * worker, so nothing here may reach for a Hono context or a browser session.
 */

import { type RuleDecision, RuntimeToolRegistry } from "@nebutra/agent-runtime";
import { getParaWorkspaceRepository } from "@nebutra/repositories";
import { z } from "zod";
import type { AuthenticatedAiOriginHeaderInput } from "../routes/ai/origin-headers.js";
import { submitParaGenerateJob } from "./para-origin.js";

/** Tools that spend credits. The autonomy switch only ever gates these. */
export const SPENDING_TOOLS = new Set(["generate_image"]);

const IMAGE_COST = 1;
const VIDEO_COST = 7;

export function estimateToolCost(toolName: string, args: unknown): number {
  if (!SPENDING_TOOLS.has(toolName)) return 0;
  const a = (args ?? {}) as { count?: number; mode?: string };
  const unit = a.mode === "video" ? VIDEO_COST : IMAGE_COST;
  return unit * Math.max(1, Math.min(4, a.count ?? 1));
}

/**
 * The autonomy switch, expressed as agent-runtime's rule evaluator: reads and cheap writes run
 * unattended; anything that spends needs a human unless the thread says "act without asking".
 * Two states only (docs/product-intelligence/agent.md decision 9).
 */
export function createParaRuleEvaluator(autonomy: "ASK" | "ACT") {
  return (toolName: string): RuleDecision => {
    if (!SPENDING_TOOLS.has(toolName)) return "allow";
    return autonomy === "ACT" ? "allow" : "prompt";
  };
}

export interface ParaToolContext {
  tenantId: string;
  workspaceId: string;
  /** Signed origin headers for job submission; the runner builds it once per run. */
  origin: AuthenticatedAiOriginHeaderInput;
  /** Nodes the user attached in the composer; the agent treats the first as the default source. */
  contextNodeIds: string[];
}

interface DocumentNode {
  id: string;
  type: string;
  status?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  generator?: { prompt?: string; model?: string };
}

interface WorkspaceDocumentShape {
  version: number;
  nodes: Record<string, DocumentNode>;
  edges: Record<string, { id: string; source: string; target: string; kind: string }>;
  viewport: { x: number; y: number; zoom: number };
}

const emptyDoc = (): WorkspaceDocumentShape => ({
  version: 2,
  nodes: {},
  edges: {},
  viewport: { x: 0, y: 0, zoom: 1 },
});

let counter = 0;
function newNodeId(): string {
  return `n-${Date.now().toString(36)}-${(counter++).toString(36)}`;
}

/**
 * Read-modify-write the document under its version token. A conflict means a human moved something
 * while the agent was thinking; retrying once is enough for the append-only edits made here.
 */
async function mutateDocument(
  tenantId: string,
  workspaceId: string,
  mutate: (doc: WorkspaceDocumentShape) => void,
): Promise<WorkspaceDocumentShape> {
  const repo = getParaWorkspaceRepository(tenantId);
  for (let attempt = 0; attempt < 2; attempt++) {
    const workspace = await repo.findWorkspace(workspaceId);
    if (!workspace) throw new Error(`workspace ${workspaceId} not found`);
    const doc = { ...emptyDoc(), ...(workspace.document as unknown as WorkspaceDocumentShape) };
    doc.nodes = { ...doc.nodes };
    doc.edges = { ...doc.edges };
    mutate(doc);
    try {
      const { workspace: saved } = await repo.putDocument(
        workspaceId,
        workspace.documentVersion,
        doc,
      );
      return saved.document as unknown as WorkspaceDocumentShape;
    } catch (err) {
      if (err instanceof Error && err.name === "DocumentVersionConflictError" && attempt === 0) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("document changed while the agent was writing");
}

/** Place a derived child to the right of its source, or in open space when there is none. */
function placeChild(doc: WorkspaceDocumentShape, sourceId: string | undefined) {
  const source = sourceId ? doc.nodes[sourceId] : undefined;
  if (source) return { x: source.x + source.width + 48, y: source.y };
  const nodes = Object.values(doc.nodes);
  const right = nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0);
  return { x: right + 48, y: 120 };
}

export function createParaToolRegistry(ctx: ParaToolContext): RuntimeToolRegistry {
  const tools = new RuntimeToolRegistry();

  tools.register(
    {
      name: "canvas_read",
      description:
        "List the nodes on the current canvas with their type, status, prompt and geometry.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      const workspace = await getParaWorkspaceRepository(ctx.tenantId).findWorkspace(
        ctx.workspaceId,
      );
      const doc = (workspace?.document as unknown as WorkspaceDocumentShape) ?? emptyDoc();
      const nodes = Object.values(doc.nodes ?? {}).map((n) => ({
        id: n.id,
        type: n.type,
        status: n.status ?? "completed",
        prompt: n.generator?.prompt ?? n.text ?? null,
        width: n.width,
        height: n.height,
      }));
      return { nodes, attachedNodeIds: ctx.contextNodeIds };
    },
  );

  tools.register(
    {
      name: "create_text_node",
      description: "Append a text note to the canvas. Free — use it for beats, loglines and plans.",
      inputSchema: z.object({ text: z.string().min(1).max(2000) }).strict(),
    },
    async ({ text }) => {
      const id = newNodeId();
      const sourceId = ctx.contextNodeIds[0];
      await mutateDocument(ctx.tenantId, ctx.workspaceId, (doc) => {
        const at = placeChild(doc, sourceId);
        doc.nodes[id] = {
          id,
          type: "text",
          text,
          status: "completed",
          x: at.x,
          y: at.y,
          width: 260,
          height: 72,
        };
      });
      return { nodeId: id, type: "text" };
    },
  );

  tools.register(
    {
      name: "generate_image",
      description:
        "Generate an image on the canvas. Spends credits. Creates a placeholder node linked to " +
        "its source by a derived edge, then submits the generation job.",
      inputSchema: z
        .object({
          prompt: z.string().min(1).max(4000),
          sourceNodeId: z.string().max(64).optional(),
          aspect: z.enum(["16:9", "1:1", "9:16", "4:3"]).default("16:9"),
          count: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1),
        })
        .strict(),
    },
    async ({ prompt, sourceNodeId, aspect, count }) => {
      const sourceId = sourceNodeId || ctx.contextNodeIds[0];

      const nodeId = newNodeId();
      await mutateDocument(ctx.tenantId, ctx.workspaceId, (doc) => {
        const at = placeChild(doc, sourceId);
        doc.nodes[nodeId] = {
          id: nodeId,
          type: "image",
          status: "queued",
          x: at.x,
          y: at.y,
          width: 288,
          height: 162,
          generator: { prompt, model: "Auto" },
        };
        if (sourceId && doc.nodes[sourceId]) {
          const edgeId = `e-${nodeId}`;
          doc.edges[edgeId] = { id: edgeId, source: sourceId, target: nodeId, kind: "derived" };
        }
      });

      const envelope = await submitParaGenerateJob(ctx.origin, {
        workspaceId: ctx.workspaceId,
        nodeId,
        generator: {
          mode: "image",
          prompt,
          params: { aspect },
          count,
          ...(sourceId ? { references: [{ kind: "node" as const, id: sourceId }] } : {}),
        },
      });
      return { nodeId, jobId: String(envelope.id ?? ""), sourceNodeId: sourceId ?? null };
    },
  );

  return tools;
}
