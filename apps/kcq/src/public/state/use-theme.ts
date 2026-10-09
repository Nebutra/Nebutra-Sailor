/**
 * Colour mode for the public pages: one page-lifetime state (VueUse `createGlobalState`), read by
 * the header and footer controls, the hero chart and the light field.
 *
 * Prerender cannot know the visitor's mode, so state starts at `system`/light and `hydrate()` (called
 * once from public-app.vue after hydration) reads storage and `prefers-color-scheme`. The blocking
 * theme-init script has already set `data-theme`, so settling repaints nothing. The state is never
 * written during prerender, so the module singleton cannot leak between rendered routes.
 */
import { createGlobalState } from "@vueuse/core";
import { computed, readonly, ref, watch } from "vue";
import { browserStorage } from "../locale";
import {
  applyThemeMode,
  readThemePreference,
  resolveThemeMode,
  storeThemePreference,
  type ThemeMode,
  type ThemePreference,
} from "../theme";

export const useTheme = createGlobalState(() => {
  const preference = ref<ThemePreference>("system");
  const systemDark = ref(false);
  const hydrated = ref(false);
  const mode = computed<ThemeMode>(() => resolveThemeMode(preference.value, systemDark.value));

  // Owned by the global effect scope: lives as long as the page.
  watch(mode, (next) => {
    if (hydrated.value) applyThemeMode(document.documentElement, next);
  });

  function hydrate() {
    if (hydrated.value) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", (event) => (systemDark.value = event.matches));
    systemDark.value = media.matches;
    preference.value = readThemePreference(browserStorage());
    hydrated.value = true;
    applyThemeMode(document.documentElement, mode.value);
  }

  function choose(next: ThemePreference) {
    preference.value = next;
    storeThemePreference(browserStorage(), next);
  }

  return {
    preference: readonly(preference),
    mode,
    /** False in the prerendered HTML and during hydration; true once the real mode is known. */
    hydrated: readonly(hydrated),
    hydrate,
    choose,
  };
});
