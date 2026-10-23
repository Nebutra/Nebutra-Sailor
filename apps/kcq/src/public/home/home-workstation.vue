<!-- 工作台概览展示真实产品截图，按市场说明数据来源，避免把所有行情统称为实时。 -->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import WorkstationShot from "../components/workstation-shot.vue";
import PageSection from "../components/page-section.vue";
import { APP_PATH } from "../routes";

const { t } = useI18n();
const sourceKeys = ["aShares", "global", "crypto"];
</script>
<template>
  <PageSection id="markets" :heading="t('home.workstation.heading')" :lede="t('home.workstation.body')">
    <template #head>
      <a class="section-link" :href="APP_PATH">
        {{ t("home.workstation.open") }}
        <KcqIcon class="button-arrow" name="arrow" />
      </a>
    </template>
    <WorkstationShot :alt="t('home.workstation.alt')">{{ t("home.workstation.alt") }} {{ facts.version }}</WorkstationShot>
    <dl class="workstation-sources" :aria-label="t('home.workstation.sourcesLabel')">
      <div v-for="key in sourceKeys" :key="key" class="workstation-source">
        <dt class="t-label">{{ t(`home.workstation.sources.${key}.market`) }}</dt>
        <dd class="t-copy">{{ t(`home.workstation.sources.${key}.detail`) }}</dd>
      </div>
    </dl>
    <p class="source-note t-meta">{{ t("home.workstation.availability") }}</p>
  </PageSection>
</template>
<style scoped>
/* 来源是截图的说明文字，用分隔线建立层级，不增加独立卡片。 */
.workstation-sources {
  display: grid;
  gap: var(--klc-space-16) var(--klc-space-32);
  margin-top: var(--klc-space-24);
}
.workstation-source {
  display: grid;
  align-content: start;
  gap: var(--klc-space-8);
  padding-top: var(--klc-space-16);
  border-top: 1px solid var(--kcq-rule);
}
.source-note {
  margin-top: var(--klc-space-16);
}
@media (min-width: 768px) {
  .workstation-sources {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
