<!-- Final CTA (landing-benchmark §6.10): the one action again, with the install command. -->
<script setup lang="ts">
import { brand } from "@nebutra/brand/metadata";
import { useI18n } from "vue-i18n";
import { glyphPath } from "../brand/glyph";
import CopyCommand from "../components/copy-command.vue";
import KcqIcon from "../components/kcq-icon.vue";
import { APP_PATH } from "../routes";

const { t } = useI18n();
const path = glyphPath();
</script>
<template>
  <section class="section" aria-labelledby="cta-heading">
    <div class="container">
      <div class="cta">
        <svg class="cta-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path :d="path" /></svg>
        <h2 id="cta-heading" class="t-heading">{{ t("home.cta.heading") }}</h2>
        <p class="t-lede">{{ t("home.cta.body", { brand: brand.name }) }}</p>
        <div class="cta-actions">
          <a class="button button-primary" :href="APP_PATH">
            {{ t("home.cta.primary") }}
            <KcqIcon class="button-arrow" name="arrow" />
          </a>
          <CopyCommand command="pnpm add @363045841yyt/klinechart" :label="t('home.hero.copy')" :done="t('home.hero.copied')" />
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.cta {
  display: grid;
  justify-items: start;
  gap: var(--klc-space-16);
  padding: var(--klc-space-48) var(--klc-space-24);
  border: 1px solid var(--kcq-rule);
  background: var(--kcq-surface);
}
@media (min-width: 1024px) {
  .cta {
    padding: var(--klc-space-80) var(--klc-space-64);
  }
}
.cta-glyph {
  width: var(--klc-space-32);
  height: var(--klc-space-32);
  fill: var(--kcq-accent);
  margin-bottom: var(--klc-space-8);
}
.cta .t-lede {
  max-width: 36rem;
}
.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-12);
  margin-top: var(--klc-space-8);
}
</style>
