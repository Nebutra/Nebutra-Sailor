/** Public pages: settle the locale, then hydrate the prerendered HTML. No auth or persistence boot. */
import { createHead } from "@unhead/vue/client";
import { createWebHistory } from "vue-router";
import { installPreloadRecovery } from "../preload-recovery";
import { createPublicApp } from "./create-app";
import { browserStorage, readStoredLocale, resolveLocaleRedirect } from "./locale";
import "./public.css";

const redirect = resolveLocaleRedirect({
  pathname: window.location.pathname,
  languages: navigator.languages ?? [navigator.language],
  stored: readStoredLocale(browserStorage()),
});
if (redirect) {
  window.location.replace(redirect + window.location.search + window.location.hash);
} else {
  installPreloadRecovery();
  const { app, router } = createPublicApp(createWebHistory(), createHead());
  void router.isReady().then(() => app.mount("#app"));
}
