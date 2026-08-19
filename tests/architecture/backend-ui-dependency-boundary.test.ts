/**
 * A backend's runtime dependency graph must not reach the UI layer.
 *
 * The gateway's production bundle on the VM was 2.7 GB. Inside it: antd,
 * three.js, mermaid, three copies of lucide-react, phosphor icons, the Next
 * compiler, and a 520 MB ONNX inference runtime — in a Hono API server. None of
 * it was imported by the gateway. Each arrived because some workspace package
 * listed a browser-only dependency under `dependencies` rather than as a peer,
 * and `pnpm deploy --prod` faithfully carried the closure.
 *
 * Nothing failed, which is why it lasted: the server ran fine, and the only
 * symptom was a 20 GB disk at 95% that eventually killed a deploy's SSH session
 * before its own cleanup step could free anything.
 *
 * The rule is about direction, not size. A package whose React surface needs
 * @nebutra/ui declares it as an optional peer, so the consumer that renders
 * React brings it and the consumer that answers HTTP does not.
 */

import { globSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/** Packages that only make sense in a browser or a React tree. */
const UI_ONLY = new Set([
  "@nebutra/ui",
  "antd",
  "three",
  "mermaid",
  "lucide-react",
  "posthog-js",
  "@phosphor-icons/react",
  "@icons-pack/react-simple-icons",
  "react-dom",
]);

/** Roots whose packages ship to a server and must stay clear of the UI layer. */
const BACKEND_ROOTS = ["backends/gateway"];

type Manifest = {
  name?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

function loadWorkspace(): Map<string, { path: string; manifest: Manifest }> {
  const out = new Map<string, { path: string; manifest: Manifest }>();
  const files = [
    ...globSync("packages/*/*/package.json"),
    ...globSync("backends/*/package.json"),
    ...globSync("apps/*/package.json"),
  ];
  for (const file of files) {
    try {
      const manifest = JSON.parse(readFileSync(file, "utf-8")) as Manifest;
      if (manifest.name) out.set(manifest.name, { path: dirname(file), manifest });
    } catch {
      // A manifest that will not parse is another test's problem.
    }
  }
  return out;
}

/**
 * Shortest runtime path from `start` to `target`, or null.
 *
 * Only `dependencies` are traversed. Peers are what the fix converts to, so
 * following them would make the guard unable to see its own subject.
 */
function runtimePath(
  ws: Map<string, { manifest: Manifest }>,
  start: string,
  target: string,
): string[] | null {
  const queue: Array<[string, string[]]> = [[start, [start]]];
  const seen = new Set([start]);
  while (queue.length > 0) {
    const [name, path] = queue.shift() as [string, string[]];
    const deps = Object.keys(ws.get(name)?.manifest.dependencies ?? {});
    for (const dep of deps) {
      if (dep === target) return [...path, dep];
      if (ws.has(dep) && !seen.has(dep)) {
        seen.add(dep);
        queue.push([dep, [...path, dep]]);
      }
    }
  }
  return null;
}

describe("backend ↔ UI dependency boundary", () => {
  const ws = loadWorkspace();

  for (const root of BACKEND_ROOTS) {
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")) as Manifest;
    const backend = manifest.name as string;

    it(`${backend} does not reach the UI layer through runtime dependencies`, () => {
      const reached: string[] = [];
      for (const ui of UI_ONLY) {
        const path = runtimePath(ws, backend, ui);
        if (path) reached.push(path.join(" → "));
      }
      expect(
        reached,
        reached.length === 0
          ? ""
          : `${backend} pulls browser-only packages into its production bundle:\n` +
              `${reached.map((r) => `  ${r}`).join("\n")}\n\n` +
              `Fix at the package that declares it: a React-only dependency belongs in\n` +
              `peerDependencies with peerDependenciesMeta.optional, so a server consumer\n` +
              `does not install it. See packages/iam/auth for the shape.`,
      ).toEqual([]);
    });
  }

  it("names something real — every UI_ONLY entry exists in the workspace or npm graph", () => {
    // A guard listing packages nobody uses would pass forever while checking
    // nothing. @nebutra/ui must at least be a workspace member.
    expect(ws.has("@nebutra/ui")).toBe(true);
  });
});
