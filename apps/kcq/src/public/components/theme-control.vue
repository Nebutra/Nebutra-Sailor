<!--
  Colour mode control. `segmented`: a radiogroup of System / Light / Dark (footer, full choice).
  `cycle`: one button that steps through the same three (header, where space is short).
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { THEME_PREFERENCES, type ThemePreference } from "../theme";
import { useTheme } from "../state/use-theme";
import KcqIcon from "./kcq-icon.vue";

const props = defineProps<{ variant: "segmented" | "cycle" }>();
const { t } = useI18n();
const { preference, choose } = useTheme();
const next = computed<ThemePreference>(
  () => THEME_PREFERENCES[(THEME_PREFERENCES.indexOf(preference.value) + 1) % THEME_PREFERENCES.length],
);
const cycleLabel = computed(
  () => `${t("nav.theme")}: ${t(`nav.themes.${preference.value}`)}`,
);

/** Arrow keys move the selection inside the radiogroup (WAI-ARIA radio pattern). */
function onKey(event: KeyboardEvent) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step) return;
  event.preventDefault();
  const index = (THEME_PREFERENCES.indexOf(preference.value) + step + 3) % 3;
  choose(THEME_PREFERENCES[index]);
  const group = event.currentTarget as HTMLElement;
  group.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
}
</script>
<template>
  <button
    v-if="props.variant === 'cycle'"
    type="button"
    class="theme-cycle"
    :aria-label="cycleLabel"
    :title="cycleLabel"
    @click="choose(next)"
  >
    <KcqIcon :name="preference" />
  </button>
  <div v-else class="theme-segmented" role="radiogroup" :aria-label="t('nav.theme')" @keydown="onKey">
    <button
      v-for="item in THEME_PREFERENCES"
      :key="item"
      type="button"
      role="radio"
      class="theme-option"
      :aria-checked="preference === item"
      :tabindex="preference === item ? 0 : -1"
      :title="t(`nav.themes.${item}`)"
      @click="choose(item)"
    >
      <KcqIcon :name="item" />
      <span class="visually-hidden">{{ t(`nav.themes.${item}`) }}</span>
    </button>
  </div>
</template>
<style scoped>
.theme-cycle,
.theme-option {
  display: inline-grid;
  place-items: center;
  width: var(--klc-density-comfortable);
  height: var(--klc-density-comfortable);
  padding: 0;
  border: 0;
  border-radius: var(--klc-radius-sm);
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
  transition-property: color, background-color, transform;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
.theme-cycle:active,
.theme-option:active {
  transform: scale(var(--kcq-press-icon));
}
@media (hover: hover) and (pointer: fine) {
  .theme-cycle:hover,
  .theme-option:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
.theme-segmented {
  display: inline-flex;
  gap: var(--klc-space-2);
  padding: var(--klc-space-2);
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-full);
}
.theme-option {
  width: var(--klc-density-default);
  height: var(--klc-density-default);
  border-radius: var(--klc-radius-full);
}
.theme-option[aria-checked="true"] {
  color: var(--kcq-ink);
  background: var(--kcq-control);
}
@media (pointer: coarse) {
  .theme-cycle,
  .theme-option {
    width: var(--klc-density-hit-target-touch);
    height: var(--klc-density-hit-target-touch);
  }
}
</style>
