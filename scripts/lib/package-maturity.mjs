import { getReleaseSurfaceDiagnostics } from "./release-surface.mjs";

export const PACKAGE_GRAPHS = ["core", "runtime", "labs"];
export const PACKAGE_STATUSES = ["stable", "foundation", "wip", "deprecated"];

const RUNTIME_NAMES = new Set([
  "@nebutra/agent-runtime",
  "@nebutra/agents",
  "@nebutra/ai-providers",
  "@nebutra/event-log",
  "@nebutra/execution-policy",
  "@nebutra/mcp",
  "@nebutra/sandbox-runtime",
  "@nebutra/tool-registry",
]);

const CORE_APP_DIRS = new Set([
  "apps/admin",
  "apps/auth",
  "apps/idp",
  "apps/landing",
  "apps/mail-preview",
  "apps/sailor-docs",
  "apps/storybook",
  "apps/studio",
  "apps/web",
  "backends/gateway",
]);

const LABS_APP_DIRS = new Set([
  "apps/design",
  "apps/forge",
  "apps/pebble",
  "apps/router",
  "apps/sleptons",
  "apps/typelens",
]);

const LABS_PACKAGE_NAMES = new Set([
  "@nebutra/3d-pipeline",
  "@nebutra/atelier-canvas",
  "@nebutra/audio-pipeline",
  "@nebutra/brand-genesis",
  "@nebutra/browser-control",
  "@nebutra/cinema",
  "@nebutra/code-execution",
  "@nebutra/cofounder-match",
  "@nebutra/collab",
  "@nebutra/content-store",
  "@nebutra/document-pipeline",
  "@nebutra/ecosystem-safety",
  "@nebutra/forge-dns-leak",
  "@nebutra/forge-runtime",
  "@nebutra/founder-cemetery",
  "@nebutra/generation-context",
  "@nebutra/idea-plaza",
  "@nebutra/image-pipeline",
  "@nebutra/knowledge-base",
  "@nebutra/knowledge-graph",
  "@nebutra/landing-builder",
  "@nebutra/local-embedding",
  "@nebutra/outreach-engine",
  "@nebutra/play-loader",
  "@nebutra/play-marketplace",
  "@nebutra/prepaid-wallet",
  "@nebutra/reel",
  "@nebutra/router-supply",
  "@nebutra/saga",
  "@nebutra/startup-os",
  "@nebutra/support-deflector",
  "@nebutra/time-machine",
  "@nebutra/tts",
  "@nebutra/typelens-catalog",
  "@nebutra/video-compose",
  "@nebutra/video-pipeline",
  "@nebutra/voice-realtime",
  "@nebutra/workflow-runtime",
]);

export function inferGraph(entry) {
  const name = entry.manifest.name;
  const dir = entry.relativeDir.replaceAll("\\", "/");
  const status = entry.manifest.nebutra?.status;
  if (RUNTIME_NAMES.has(name)) return "runtime";
  if (LABS_PACKAGE_NAMES.has(name) || LABS_APP_DIRS.has(dir)) return "labs";
  if (status === "foundation" || status === "stable") return "core";
  if (CORE_APP_DIRS.has(dir)) return "core";
  if (dir.startsWith("packages/iam/")) return "core";
  if (dir.startsWith("packages/platform/")) return "core";
  if (dir.startsWith("packages/commerce/")) return "core";
  if (dir.startsWith("packages/ops/")) return "core";
  if (dir.startsWith("packages/design/")) return "core";
  if (dir.startsWith("packages/integrations/")) return "core";
  if (dir.startsWith("packages/ai/")) return "labs";
  return "labs";
}

export function inferUndeclaredStatus(graph) {
  if (graph === "core") return "foundation";
  return "wip";
}

export function classifyPackage(entry) {
  const meta = entry.manifest.nebutra ?? {};
  const graph = PACKAGE_GRAPHS.includes(meta.graph) ? meta.graph : inferGraph(entry);
  const status = PACKAGE_STATUSES.includes(meta.status)
    ? meta.status
    : inferUndeclaredStatus(graph);
  return {
    name: entry.manifest.name,
    dir: entry.relativeDir,
    graph,
    status,
    declaredStatus: Boolean(meta.status),
    declaredGraph: Boolean(meta.graph),
    productionReady: meta.productionReady === true,
  };
}

export function getPackageMaturityDiagnostics(root = process.cwd()) {
  const { packages } = getReleaseSurfaceDiagnostics(root);
  const classified = packages.map(classifyPackage);
  return {
    packages: classified,
    undeclaredStatus: classified.filter((item) => !item.declaredStatus),
    undeclaredGraph: classified.filter((item) => !item.declaredGraph),
    byGraph: Object.fromEntries(
      PACKAGE_GRAPHS.map((graph) => [graph, classified.filter((item) => item.graph === graph)]),
    ),
    byStatus: Object.fromEntries(
      [...PACKAGE_STATUSES, "undeclared"].map((status) => [
        status,
        classified.filter((item) =>
          status === "undeclared" ? !item.declaredStatus : item.status === status,
        ),
      ]),
    ),
  };
}

export function isReleaseGraph(graph) {
  return graph === "core" || graph === "runtime";
}
