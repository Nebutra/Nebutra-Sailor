import type { ModelAliasEntry, RouterUpstreamTarget } from "@nebutra/prepaid-wallet";
import type { AliasTable } from "./alias";
import { resolveAliases } from "./alias";
import { chatCompletionsUrl, type ResolvedEngine } from "./engines";

export class SupplyResolveError extends Error {
  readonly code: "model_unmapped" | "engine_unavailable";

  constructor(code: "model_unmapped" | "engine_unavailable", message: string) {
    super(message);
    this.name = "SupplyResolveError";
    this.code = code;
  }
}

/**
 * Build ordered upstream targets for a public model (fallback chain).
 */
export function resolveUpstreamChain(input: {
  readonly publicModel: string;
  readonly engines: readonly ResolvedEngine[];
  readonly aliases: AliasTable;
  readonly requestId: string;
}): RouterUpstreamTarget[] {
  const { publicModel, engines, aliases, requestId } = input;
  const engineById = new Map(engines.filter((e) => e.enabled).map((e) => [e.id, e]));

  const rows = resolveAliases(aliases, publicModel);
  if (rows.length === 0) {
    throw new SupplyResolveError("model_unmapped", `No alias for model: ${publicModel}`);
  }

  // Wildcard * means pass public model name through
  const targets: RouterUpstreamTarget[] = [];
  for (const row of rows) {
    const engine = engineById.get(row.engineId);
    if (!engine) continue;
    const upstreamModel = row.upstreamModel === "*" ? publicModel : row.upstreamModel;
    targets.push({
      engineId: engine.id,
      kind: engine.kind,
      url: chatCompletionsUrl(engine.baseUrl),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${engine.apiKey}`,
        "X-Nebutra-Request-Id": requestId,
        "X-Nebutra-Engine": engine.id,
        "X-Nebutra-Supply-Class": supplyClassFor(engine.kind),
      },
      upstreamModel,
    });
  }

  if (targets.length === 0) {
    throw new SupplyResolveError(
      "engine_unavailable",
      `No healthy engine for model: ${publicModel}`,
    );
  }
  return targets;
}

function supplyClassFor(kind: ResolvedEngine["kind"]): string {
  switch (kind) {
    case "official":
      return "A";
    case "sub2api":
    case "cliproxyapi":
      return "B";
    case "newapi":
      return "C";
    default:
      return "C";
  }
}

/** Convert alias rows into OpenAI-style /v1/models list entries. */
export function toOpenAiModelList(aliases: AliasTable): {
  object: "list";
  data: Array<{ id: string; object: "model"; owned_by: string }>;
} {
  const ids = [
    ...new Set(
      aliases.entries
        .filter((e: ModelAliasEntry) => e.publicModel !== "*")
        .map((e) => e.publicModel),
    ),
  ].sort();
  return {
    object: "list",
    data: ids.map((id) => ({
      id,
      object: "model" as const,
      owned_by: "nebutra-router",
    })),
  };
}
