/**
 * Shared colour-mode state for the public pages. The prerendered HTML cannot know the visitor's
 * mode, so state starts at `system` and settles from storage and `prefers-color-scheme` once
 * mounted; theme-init has already set `data-theme`, so nothing repaints.
 */
import { onBeforeUnmount, onMounted, readonly, ref } from "vue";
import { browserStorage } from "./locale";
import {
  applyThemeMode,
  readThemePreference,
  resolveThemeMode,
  storeThemePreference,
  type ThemeMode,
  type ThemePreference,
} from "./theme";

const preference = ref<ThemePreference>("system");
const mode = ref<ThemeMode>("light");
let media: MediaQueryList | undefined;
let users = 0;

function sync() {
  mode.value = resolveThemeMode(preference.value, media?.matches ?? false);
  applyThemeMode(document.documentElement, mode.value);
}

export function useTheme() {
  onMounted(() => {
    if (users++ === 0) {
      media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", sync);
      preference.value = readThemePreference(browserStorage());
      sync();
    }
  });
  onBeforeUnmount(() => {
    if (--users === 0) media?.removeEventListener("change", sync);
  });
  function choose(next: ThemePreference) {
    preference.value = next;
    storeThemePreference(browserStorage(), next);
    sync();
  }
  return { preference: readonly(preference), mode: readonly(mode), choose };
}
