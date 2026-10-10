/**
 * The workbench shell (index.html) waits for the session before it may import the workbench:
 * modules that create chart persistence must load after `configureBrowserPersistenceScope`
 * (src/main.ts). Before this plugin the chunks then arrived one round trip at a time
 * (session → market-connectors → market-connections → workbench + chart core), so the session
 * check and every hop sat on the critical path (perf audit 2026-10-10).
 *
 * `<link rel="modulepreload">` fetches and compiles a module without evaluating it, so the
 * download overlaps the session check and the persistence order is unchanged: evaluation still
 * happens at the dynamic import in main.ts.
 */

/** The dynamic imports main.ts makes on the workbench route, in order. */
export const APP_PRELOAD_ENTRIES =
  /\/src\/(?:market-connectors|market-connections)\.ts$|\/src\/workbench\.vue$/;

/**
 * Chunks (and their CSS) to preload for an entry chunk: the matching dynamic imports and
 * everything they import statically, minus what the entry already loads statically.
 */
export function appPreloads(bundle, entry, match = APP_PRELOAD_ENTRIES) {
  const byName = new Map(
    Object.values(bundle)
      .filter((item) => item.type === "chunk")
      .map((chunk) => [chunk.fileName, chunk]),
  );
  const loaded = new Set([entry.fileName]);
  const walkStatic = (chunk, into) => {
    for (const name of chunk.imports ?? []) {
      if (into.has(name)) continue;
      into.add(name);
      const next = byName.get(name);
      if (next) walkStatic(next, into);
    }
  };
  walkStatic(entry, loaded);
  const scripts = new Set();
  for (const name of entry.dynamicImports ?? []) {
    const chunk = byName.get(name);
    if (!chunk?.facadeModuleId || !match.test(chunk.facadeModuleId)) continue;
    scripts.add(name);
    walkStatic(chunk, scripts);
  }
  for (const name of loaded) scripts.delete(name);
  const styles = new Set();
  for (const name of scripts)
    for (const css of byName.get(name)?.viteMetadata?.importedCss ?? []) styles.add(css);
  return { scripts: [...scripts].sort(), styles: [...styles].sort() };
}

export function appPreload() {
  let base = "/";
  return {
    name: "kcq-app-preload",
    apply: "build",
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: "post",
      handler(_html, { bundle, chunk, filename }) {
        if (!bundle || !chunk || !filename.endsWith("/index.html")) return;
        const { scripts, styles } = appPreloads(bundle, chunk);
        return [
          ...scripts.map((file) => ({
            tag: "link",
            attrs: { rel: "modulepreload", crossorigin: true, href: base + file },
            injectTo: "head",
          })),
          ...styles.map((file) => ({
            tag: "link",
            attrs: { rel: "preload", as: "style", crossorigin: true, href: base + file },
            injectTo: "head",
          })),
        ];
      },
    },
  };
}
