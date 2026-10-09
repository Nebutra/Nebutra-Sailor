/**
 * The public bundle boundary (vite.config.mjs runs it on every client build): nothing reachable
 * from public.html may load auth, chart persistence, the workbench, Agent providers or React.
 */
/** Modules the public pages must never load: auth, chart persistence, workbench, Agent, React islands. */
export const PUBLIC_FORBIDDEN =
  /\/(?:src\/(?:main|use-workbench|workbench[^/]*|profile[^/]*|header-surface|source-connections[^/]*|market-connect[^/]*)\.|node_modules\/(?:react|react-dom|@nebutra\/(?:auth|ui|icons))\/|packages\/(?:iam\/auth|design\/ui|core|vue|agent-runtime)\/)/;

/**
 * The only exceptions, each a lazy chunk entered through a dynamic import (never statically from
 * public.html): the /home hero mounts the headless chart core (`createChartController`) and reads
 * bars through the core market-data transport. It still may not reach the Vue package, the Agent
 * runtime, auth, persistence or React, which stay forbidden by the pattern below.
 */
export const PUBLIC_LAZY_ALLOWLIST = [
  {
    entry: /\/src\/public\/home\/hero\/live-chart\.ts$/,
    forbidden:
      /\/(?:src\/(?:main|use-workbench|workbench[^/]*|profile[^/]*|header-surface|source-connections[^/]*|market-connect[^/]*)\.|node_modules\/(?:react|react-dom|@nebutra\/(?:auth|ui|icons))\/|packages\/(?:iam\/auth|design\/ui|vue|agent-runtime)\/)/,
  },
];

/**
 * Walk every chunk reachable from public.html (static and lazy). A chunk reached through an
 * allowlisted dynamic import is checked against that entry's narrower rule; a chunk that is also
 * reachable on a strict path is checked strictly.
 */
export function findPublicLeaks(chunks, entry) {
  const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const rules = new Map();
  const pending = [[entry, PUBLIC_FORBIDDEN]];
  const leaks = [];
  while (pending.length) {
    const [chunk, rule] = pending.pop();
    const seen = rules.get(chunk.fileName) ?? new Set();
    if (seen.has(rule)) continue;
    seen.add(rule);
    rules.set(chunk.fileName, seen);
    const leaked = chunk.moduleIds.filter((id) => rule.test(id));
    if (leaked.length) leaks.push({ chunk: chunk.fileName, modules: leaked });
    for (const next of chunk.imports) {
      if (byName.has(next)) pending.push([byName.get(next), rule]);
    }
    for (const next of chunk.dynamicImports) {
      const target = byName.get(next);
      if (!target) continue;
      const allowed = PUBLIC_LAZY_ALLOWLIST.find((item) =>
        item.entry.test(target.facadeModuleId ?? ""),
      );
      pending.push([target, allowed && rule === PUBLIC_FORBIDDEN ? allowed.forbidden : rule]);
    }
  }
  return leaks;
}

/** Fail the client build when anything reachable from public.html (static or lazy) crosses that line. */
export function publicBoundary() {
  return {
    name: "kcq-public-boundary",
    apply: "build",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((output) => output.type === "chunk");
      const entry = chunks.find(
        (chunk) => chunk.isEntry && chunk.facadeModuleId?.endsWith("/public.html"),
      );
      if (!entry) return;
      const leaks = findPublicLeaks(chunks, entry);
      if (leaks.length) {
        this.error(
          leaks
            .map(
              ({ chunk, modules }) =>
                `Public chunk ${chunk} includes app-only modules:\n${modules.join("\n")}`,
            )
            .join("\n"),
        );
      }
    },
  };
}
