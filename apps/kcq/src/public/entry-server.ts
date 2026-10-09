/** Prerender entry (scripts/prerender.mjs): renders one public route into the built public.html. */
import { createHead, transformHtmlTemplate } from "@unhead/vue/server";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory } from "vue-router";
import { createPublicApp } from "./create-app";

export { KCQ_ORIGIN, NOT_FOUND_ROUTES, PUBLIC_ROUTES } from "./routes";
export { renderLlmsTxt } from "./llms";
export { renderRobotsTxt, renderSitemapXml } from "./seo-files";

export const APP_OUTLET = "<!--kcq-public-app-->";

/** Client build's `.vite/ssr-manifest.json`: module id → emitted files. */
export type SsrManifest = Record<string, string[]>;

/**
 * Stylesheets for the lazy route chunks this page rendered, so the prerendered HTML is styled at
 * first paint instead of when the route chunk arrives.
 */
export function routeAssetLinks(modules: Iterable<string>, manifest: SsrManifest, template: string): string {
  const files = new Set<string>();
  for (const id of modules) for (const file of manifest[id] ?? []) files.add(file);
  return [...files]
    .filter((file) => !template.includes(file))
    .filter((file) => file.endsWith(".css"))
    .map((file) => `<link rel="stylesheet" crossorigin href="${file}">`)
    .join("");
}

export async function render(url: string, template: string, manifest: SsrManifest = {}): Promise<string> {
  if (!template.includes(APP_OUTLET)) throw new Error(`public.html lacks ${APP_OUTLET}`);
  const head = createHead();
  const { app, router } = createPublicApp(createMemoryHistory(), head);
  await router.push(url);
  await router.isReady();
  // The client-only catch-all (create-app.ts) matches anything; prerender renders listed routes only.
  const current = router.currentRoute.value;
  if (current.matched.length === 0 || "unknown" in current.params) throw new Error(`Not a public route: ${url}`);
  // The repo lockfile pairs vue 3.5.32 with @vue/server-renderer 3.5.43 types; at build time
  // both resolve to the canonical chart's single Vue runtime (vite.config.mjs aliases).
  const context: { modules?: Set<string> } = {};
  const html = await renderToString(app as Parameters<typeof renderToString>[0], context);
  const links = routeAssetLinks(context.modules ?? [], manifest, template);
  return transformHtmlTemplate(
    head,
    template.replace("</head>", `${links}</head>`).replace(APP_OUTLET, html),
  );
}
