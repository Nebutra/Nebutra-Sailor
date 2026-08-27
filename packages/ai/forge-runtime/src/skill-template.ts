import type { AnyForgeToolDefinition } from "./types";

/** Minimal SKILL.md body for a Core tool (W4 / F2 Track C generator). */
export function renderCoreSkillMarkdown(tool: AnyForgeToolDefinition): string {
  const next =
    tool.compose?.next?.length && tool.compose.next.length > 0
      ? tool.compose.next
          .map((id) => `- \`${id}\` (MCP: \`${id.replace(/\//g, "__")}\`)`)
          .join("\n")
      : "- (none seeded yet)";

  const sampleProps = guessSampleInput(tool);
  const sampleJson = JSON.stringify({ input: sampleProps }, null, 0);

  return `---
name: ${tool.slug}
description: ${escapeYaml(tool.description.en)}
version: 1.0.0
allowed_tools: []
mcp_servers: []
---

## What this skill does

${tool.description.en}

中文：${tool.description.zh}

## When to use

- Human or agent needs **${tool.title.en}** (\`${tool.id}\`).
- Tier: \`${tool.tier}\` · side-effect: \`${tool.sideEffect}\` · meter: \`${tool.meterId}\`.

## How to invoke

\`\`\`http
POST /api/v1/tools/invoke/${tool.id}
Content-Type: application/json

${sampleJson}
\`\`\`

MCP name: \`${tool.id.replace(/\//g, "__")}\`

## Engine

- **${tool.engine.name}** ${tool.engine.version}
- Upstream: ${tool.engine.upstream}

## Composition (next)

Chain these after a successful run when the job continues:

${next}

${
  tool.batch
    ? `## Batch

This tool supports the Processor batch surface (\`resultKind=${tool.batch.resultKind}\`, accept=\`${tool.batch.accept}\`).

- MCP: \`forge.batch.create\` with \`toolId: "${tool.id}"\`
- Poll: \`forge.batch.get\`
`
    : ""
}## Limits

- Prefer pure/deterministic path; do not invent model calls.
- Respect input schema validation errors from invoke.
`.trimStart();
}

function escapeYaml(s: string): string {
  if (/[:#\n"']/.test(s)) return JSON.stringify(s);
  return s;
}

function guessSampleInput(tool: AnyForgeToolDefinition): Record<string, unknown> {
  // Lightweight defaults by category — not a second schema source.
  switch (tool.category) {
    case "text":
      return { text: "Hello Nebutra" };
    case "codec":
      return { text: "hello", mode: "encode" };
    case "hash":
      return { text: "hello" };
    case "data":
      return { text: '{"a":1}' };
    case "dev":
      return { text: "example" };
    case "time":
      return { datetime: "2026-01-01T00:00:00Z" };
    case "llm":
      return { text: "hello" };
    case "security":
      return { length: 16 };
    case "image":
      return { text: "https://nebutra.com" };
    case "doc":
      return { text: "# Hello" };
    default:
      return {};
  }
}
