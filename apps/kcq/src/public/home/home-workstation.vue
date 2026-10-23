<!--
  Markets and data (deck 5.4; restraint benchmark §4 row 4), the page's second grand moment. The
  section grammar: heading, sub and the named sources as one quiet line, then the real product at
  full container width: a capture of the workstation at the pinned build (workstation-shot.vue),
  not a mock-up, in the visitor's colour mode like every product frame.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import WorkstationShot from "../components/workstation-shot.vue";

const { t, tm, rt } = useI18n();
const sources = computed(() => (tm("home.workstation.sources") as unknown as string[]).map((source) => rt(source)));
</script>
<template>
  <section id="markets" class="band workstation" aria-labelledby="workstation-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="workstation-heading" class="t-heading">{{ t("home.workstation.heading") }}</h2>
        <p class="t-lede">{{ t("home.workstation.body") }}</p>
        <p class="t-meta">
          <span class="visually-hidden">{{ t("home.workstation.sourcesLabel") }}: </span>
          <span translate="no">{{ sources.join(" · ") }}</span>
        </p>
      </div>
      <WorkstationShot :alt="t('home.workstation.alt')">{{ t("home.workstation.alt") }} {{ facts.version }}</WorkstationShot>
    </div>
  </section>
</template>
