/**
 * Agent-orchestration convergence ratchet.
 *
 * Locks in three deliberate convergence decisions so they cannot silently
 * regress:
 *
 *   1. ONE orchestrator construction site. The gateway builds its
 *      AgentOrchestrator only in agents/orchestrator-singleton.ts (via
 *      getGatewayOrchestrator); routes/lib must not re-grow their own
 *      per-module singletons.
 *   2. NO broadcast()/pipeline() on AgentOrchestrator. Multi-agent fan-out /
 *      pipelining is owned by @nebutra/agent-runtime (planWaves / runAgentWaves
 *      over a node topology) — the single orchestration substrate.
 *   3. Run-status enums share the SUCCEEDED spelling. AutomationRunStatus must
 *      match TaskStatus / WorkflowRunStatus, not use the lone SUCCESS.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const EXCLUDED_DIRS = new Set(["node_modules", ".next", "dist", ".turbo", "generated"]);

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (entry.isFile() && extname(entry.name) === ".ts") {
      results.push(fullPath);
    }
  }
  return results;
}

const read = (rel: string): string => readFileSync(resolve(ROOT, rel), "utf-8");
const toRel = (abs: string): string => abs.replace(`${ROOT}/`, "");

/** Drop block + line comments so prose mentioning a symbol is not a false match. */
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("agent orchestration convergence (ratchet)", () => {
  it("AgentOrchestrator is constructed only in the shared gateway factory", () => {
    const SINGLETON = "backends/gateway/src/agents/orchestrator-singleton.ts";
    const offenders = collectTsFiles(resolve(ROOT, "backends/gateway/src"))
      .filter((f) => toRel(f) !== SINGLETON)
      .filter((f) => /new\s+AgentOrchestrator\s*\(/.test(stripComments(readFileSync(f, "utf-8"))))
      .map(toRel);

    expect(
      offenders,
      `Construct AgentOrchestrator only in ${SINGLETON} via getGatewayOrchestrator(). ` +
        `These gateway files build their own instance:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("AgentOrchestrator exposes no broadcast()/pipeline() (owned by agent-runtime planWaves)", () => {
    const src = stripComments(read("packages/ai/agents/src/orchestrator.ts"));
    expect(/\bbroadcast\s*\(/.test(src), "broadcast() must not return to AgentOrchestrator").toBe(
      false,
    );
    expect(/\bpipeline\s*\(/.test(src), "pipeline() must not return to AgentOrchestrator").toBe(
      false,
    );
  });

  it("AutomationRunStatus uses SUCCEEDED, matching Task/WorkflowRunStatus", () => {
    const schema = read("packages/platform/db/prisma/schema.prisma");
    const block = schema.match(/enum AutomationRunStatus \{[^}]*\}/)?.[0] ?? "";
    expect(block, "AutomationRunStatus enum block not found in schema.prisma").not.toBe("");
    expect(block).toContain("SUCCEEDED");
    expect(
      /\bSUCCESS\b/.test(block),
      "AutomationRunStatus must not use the lone SUCCESS spelling",
    ).toBe(false);
  });
});
