/**
 * The public app: routes, locale and head only. It never imports auth, chart persistence,
 * the workbench, Agent providers or React islands (checked against the built chunks).
 */
import { createSSRApp, type Plugin } from "vue";
import { createI18n } from "vue-i18n";
import { createRouter, type RouterHistory } from "vue-router";
import { PUBLIC_MESSAGES } from "./messages";
import PublicApp from "./public-app.vue";
import {
  DEFAULT_PUBLIC_LOCALE,
  NOT_FOUND_ROUTES,
  PUBLIC_ROUTES,
  type PublicLocale,
  type PublicPage,
} from "./routes";

declare module "vue-router" {
  interface RouteMeta {
    page?: PublicPage | "notFound";
    locale?: PublicLocale;
  }
}

const pages = {
  home: () => import("./home-page.vue"),
  benchmark: () => import("./benchmark-page.vue"),
  notFound: () => import("./not-found-page.vue"),
} satisfies Record<PublicPage | "notFound", unknown>;

/** `head` is the client or server @unhead/vue instance; the caller picks the environment. */
export function createPublicApp(history: RouterHistory, head: Plugin) {
  const app = createSSRApp(PublicApp);
  const i18n = createI18n({
    legacy: false,
    locale: DEFAULT_PUBLIC_LOCALE,
    fallbackLocale: DEFAULT_PUBLIC_LOCALE,
    messages: PUBLIC_MESSAGES,
  });
  const router = createRouter({
    history,
    routes: [
      ...PUBLIC_ROUTES.map(({ path, page, locale }) => ({
        path,
        component: pages[page],
        meta: { page, locale },
      })),
      ...NOT_FOUND_ROUTES.map(({ path, locale }) => ({
        path,
        component: pages.notFound,
        meta: { page: "notFound" as const, locale },
      })),
    ],
    scrollBehavior: (to) => (to.hash ? { el: to.hash } : { top: 0 }),
  });
  router.beforeEach((to) => {
    if (to.meta.locale) i18n.global.locale.value = to.meta.locale;
  });
  app.use(router);
  app.use(i18n);
  app.use(head);
  return { app, router };
}
