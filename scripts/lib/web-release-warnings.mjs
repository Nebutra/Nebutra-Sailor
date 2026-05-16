const CRITICAL_DEPENDENCY_MARKER = "Critical dependency";

export const knownWarnings = [
  {
    id: "lobe-mermaid-vscode-languageserver",
    markers: ["@lobehub/ui", "Mermaid", "vscode-languageserver-types"],
  },
  {
    id: "nextauth-provider-dynamic-require",
    markers: ["packages/iam/auth/src/providers/nextauth.ts"],
  },
  {
    id: "opentelemetry-instrumentation-dynamic-require",
    markers: ["@opentelemetry/instrumentation"],
  },
];

function collectCriticalDependencyBlocks(log) {
  const lines = log.split(/\r?\n/);
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index]?.includes(CRITICAL_DEPENDENCY_MARKER)) continue;

    const start = Math.max(0, index - 3);
    const end = Math.min(lines.length, index + 18);
    blocks.push(lines.slice(start, end).join("\n"));
  }

  return blocks;
}

export function classifyBuildWarnings(log) {
  const criticalDependencyBlocks = collectCriticalDependencyBlocks(log);

  const known = [];
  const unknown = [];

  for (const block of criticalDependencyBlocks) {
    const match = knownWarnings.find((warning) =>
      warning.markers.every((marker) => block.includes(marker)),
    );

    if (match) {
      known.push({ id: match.id, block });
    } else {
      unknown.push(block);
    }
  }

  return { known, unknown };
}
