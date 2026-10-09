/** Prerender entry (scripts/prerender.mjs): renders one public route into the built public.html. */
import { createHead, transformHtmlTemplate } from "@unhead/vue/server";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory } from "vue-router";
import { createPublicApp } from "./create-app";

export { KCQ_ORIGIN, PUBLIC_ROUTES } from "./routes";
export { renderRobotsTxt, renderSitemapXml } from "./seo-files";

export const APP_OUTLET = "<!--kcq-public-app-->";

export async function render(url: string, template: string): Promise<string> {
  if (!template.includes(APP_OUTLET)) throw new Error(`public.html lacks ${APP_OUTLET}`);
  const head = createHead();
  const { app, router } = createPublicApp(createMemoryHistory(), head);
  await router.push(url);
  await router.isReady();
  if (router.currentRoute.value.matched.length === 0) throw new Error(`Not a public route: ${url}`);
  // The repo lockfile pairs vue 3.5.32 with @vue/server-renderer 3.5.43 types; at build time
  // both resolve to the canonical chart's single Vue runtime (vite.config.mjs aliases).
  const html = await renderToString(app as Parameters<typeof renderToString>[0]);
  return transformHtmlTemplate(head, template.replace(APP_OUTLET, html));
}
