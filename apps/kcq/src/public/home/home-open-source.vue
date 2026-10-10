<!--
  Open source and trust (deck 5.6 + 5.7, merged by founder decision 2026-10-10; restraint benchmark
  §4 row 6): one quiet text section, no artifact. Left, the open-source sub with the channels as
  inline links (the zh page lists the QQ group before Telegram). Right, "Bring your own keys and
  data sources" as a sub-heading with its sub and what the code does with keys: model API keys
  live in this browser's storage and go straight to the chosen provider (KCQ
  browser-provider-stores.ts); market-data keys need an account and are vault-encrypted per tenant
  on the gateway (backends/gateway/src/routes/kcq/store.ts); /app opens as a guest (main.ts). The
  deck's facts close it as one sentence-case line. Static (motion spec: trust areas stay still);
  "Not investment advice." stays in the footer's legal line.
-->
<script setup lang="ts">
import { brand } from "@nebutra/brand/metadata";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { LINKS } from "../links";
import { usePublicLocale } from "../state/use-public-locale";

const { t, tm, rt } = useI18n();
const { locale } = usePublicLocale();
const channels = computed(() => {
  const github = { key: "github", href: LINKS.github };
  const telegram = { key: "telegram", href: LINKS.telegram };
  const qq = { key: "qq", href: LINKS.qq };
  return locale.value === "zh" ? [github, qq, telegram] : [github, telegram, qq];
});
const facts = computed(() => (tm("home.trust.facts") as unknown as string[]).map((fact) => rt(fact)));
</script>
<template>
  <section id="community" class="band open-source" aria-labelledby="community-heading">
    <div class="container">
      <h2 id="community-heading" class="t-heading">{{ t("home.community.heading") }}</h2>
      <div class="open-source-grid">
        <div class="open-source-column">
          <p class="t-lede">{{ t("home.community.body") }}</p>
          <p class="channels">
            <template v-for="(channel, index) in channels" :key="channel.key">
              <span v-if="index" class="channel-sep" aria-hidden="true">·</span>
              <a :href="channel.href" rel="noopener">{{ t(`home.community.${channel.key}`) }}</a>
            </template>
          </p>
        </div>
        <div id="trust" class="open-source-column">
          <h3 class="t-title">{{ t("home.trust.heading") }}</h3>
          <p class="t-lede">{{ t("home.trust.body") }}</p>
          <p class="t-copy">{{ t("home.trust.detail", { brand: brand.name }) }}</p>
        </div>
      </div>
      <p class="facts t-copy">{{ facts.join(" · ") }}</p>
    </div>
  </section>
</template>
<style scoped>
.open-source-grid {
  display: grid;
  gap: var(--klc-space-40) var(--kcq-column-gap);
  margin-top: var(--klc-space-24);
}
.open-source-column {
  display: grid;
  align-content: start;
  gap: var(--klc-space-16);
  max-width: 40rem;
}
.channels {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--klc-space-4) var(--klc-space-8);
  font-size: var(--klc-text-label-14-font-size);
  line-height: var(--klc-text-label-14-line-height);
  font-weight: var(--klc-text-label-14-font-weight);
}
.channels a {
  display: inline-flex;
  align-items: center;
  min-height: var(--klc-density-hit-target);
}
@media (pointer: coarse) {
  .channels a {
    min-height: var(--klc-density-comfortable);
  }
}
.channel-sep {
  color: var(--kcq-ink-2);
}
.facts {
  margin-top: var(--klc-space-40);
}
@media (min-width: 1024px) {
  .open-source-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .open-source-column:first-child {
    grid-column: 1 / span 5;
  }
  .open-source-column:last-child {
    grid-column: 7 / span 6;
  }
}
</style>
