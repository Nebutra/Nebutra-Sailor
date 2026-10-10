<!--
  The ask (research §4.11, §2.4): intent, not numbers. Two tracks, investors and design partners,
  each one prefilled email to the founders' inbox (contact.ts); the address itself stays on the
  page with a copy button for anyone whose browser has no mail client. The page's one dark block,
  which the footer continues, as /home's final CTA; one H2 size, and the tracks are plain columns,
  not cards (restraint benchmark rules 2, 4, 9).
-->
<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { CONTACT_TRACKS, INVESTOR_EMAIL, mailtoHref } from "./contact";

const { t } = useI18n();
const tracks = computed(() =>
  CONTACT_TRACKS.map((track) => ({
    track,
    title: t(`investors.ask.${track}.title`),
    body: t(`investors.ask.${track}.body`),
    cta: t(`investors.ask.${track}.cta`),
    href: mailtoHref(t(`investors.ask.${track}.subject`), t("investors.ask.mailBody")),
  })),
);
const { copy, copied, isSupported } = useClipboard({ copiedDuring: 1500, legacy: true });
</script>
<template>
  <section id="contact" class="band ask" data-theme="dark" aria-labelledby="ask-heading">
    <div class="container ask-grid">
      <div class="ask-head">
        <h2 id="ask-heading" class="t-heading ask-heading">{{ t("investors.ask.heading") }}</h2>
        <p class="t-lede">{{ t("investors.ask.body") }}</p>
      </div>
      <ul class="tracks">
        <li v-for="(item, index) in tracks" :key="item.track" class="track">
          <h3 class="t-title">{{ item.title }}</h3>
          <p class="t-copy">{{ item.body }}</p>
          <a class="button" :class="index === 0 ? 'button-primary' : 'button-quiet'" :href="item.href">
            {{ item.cta }}
            <KcqIcon class="button-arrow" name="arrow" />
          </a>
        </li>
      </ul>
      <p class="ask-direct">
        <span class="t-copy">{{ t("investors.ask.direct") }}</span>
        <a class="ask-email" :href="`mailto:${INVESTOR_EMAIL}`" translate="no">{{ INVESTOR_EMAIL }}</a>
        <button
          type="button"
          class="ask-copy"
          :data-copied="copied || undefined"
          :aria-label="copied ? t('investors.ask.copied') : t('investors.ask.copy')"
          :disabled="!isSupported"
          @click="copy(INVESTOR_EMAIL)"
        >
          <KcqIcon :name="copied ? 'check' : 'copy'" />
        </button>
        <span class="visually-hidden" aria-live="polite">{{ copied ? t("investors.ask.copied") : "" }}</span>
      </p>
    </div>
  </section>
</template>
<style scoped>
/* The footer continues this ground, so the band does not need its own bottom margin of air. */
.ask {
  padding-bottom: var(--klc-space-64);
}
.ask-grid {
  display: grid;
  gap: var(--klc-space-48) var(--kcq-column-gap);
}
.ask-head {
  display: grid;
  gap: var(--klc-space-16);
  max-width: 40rem;
}
.tracks {
  display: grid;
  gap: var(--kcq-column-gap);
}
.track {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: var(--klc-space-12);
  padding-top: var(--klc-space-24);
  border-top: 1px solid var(--kcq-rule);
}
.track .button {
  margin-top: var(--klc-space-12);
}
.ask-direct {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-4) var(--klc-space-12);
}
.ask-email {
  display: inline-flex;
  align-items: center;
  min-height: var(--klc-density-default);
  color: var(--kcq-ink);
  font-size: var(--klc-text-copy-16-font-size);
  line-height: var(--klc-text-copy-16-line-height);
}
@media (pointer: coarse) {
  .ask-email {
    min-height: var(--klc-density-comfortable);
  }
}
.ask-copy {
  display: inline-grid;
  place-items: center;
  width: var(--klc-density-default);
  height: var(--klc-density-default);
  padding: 0;
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-sm);
  background: transparent;
  color: var(--kcq-ink-2);
  cursor: pointer;
  transition-property: color, background-color, transform;
  transition-duration: var(--klc-motion-dur-fast);
  transition-timing-function: var(--klc-motion-ease-out);
}
.ask-copy:active {
  transform: scale(var(--kcq-press-icon));
}
.ask-copy[data-copied] {
  color: var(--kcq-ink);
}
@media (hover: hover) and (pointer: fine) {
  .ask-copy:hover {
    color: var(--kcq-ink);
    background: var(--kcq-hover);
  }
}
@media (pointer: coarse) {
  .ask-copy {
    width: var(--klc-density-hit-target-touch);
    height: var(--klc-density-hit-target-touch);
  }
}
@media (min-width: 768px) {
  .tracks {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .ask-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: start;
  }
  .ask-head {
    grid-column: 1 / span 6;
  }
  .tracks {
    grid-column: 7 / span 6;
  }
  .ask-direct {
    grid-column: 1 / -1;
  }
}
</style>
