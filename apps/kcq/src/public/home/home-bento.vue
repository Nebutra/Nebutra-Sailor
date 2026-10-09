<!--
  Workstation tour as an asymmetric bento (landing-benchmark §3.4, BuildMVPFast): below the fold,
  one dominant tile about half the grid, small tiles that encode lower priority, one shared CTA.
  Every line restates a shipped capability from the KCQ README; no icon tiles (CP 25, LB §5).
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { APP_PATH } from "../routes";

const { t, tm, rt } = useI18n();
</script>
<template>
  <section class="section" aria-labelledby="bento-heading">
    <div class="container">
      <p class="eyebrow t-meta"><span class="eyebrow-index t-num">04</span>{{ t("home.bento.eyebrow") }}</p>
      <div class="section-head">
        <h2 id="bento-heading" class="t-heading">{{ t("home.bento.heading") }}</h2>
      </div>
      <div class="bento">
        <article class="tile tile-lead">
          <h3 class="t-title">{{ t("home.bento.sourcesHeading") }}</h3>
          <p class="t-copy">{{ t("home.bento.sourcesBody") }}</p>
          <table class="sources">
            <tbody>
              <tr v-for="(source, index) in tm('home.bento.sources')" :key="index">
                <th scope="row"><code translate="no">{{ rt(source.id) }}</code></th>
                <td class="t-copy">{{ rt(source.what) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="t-copy tile-foot">{{ t("home.bento.byok") }}</p>
        </article>
        <article v-for="(tile, index) in tm('home.bento.tiles')" :key="index" class="tile">
          <h3 class="t-label">{{ rt(tile.title) }}</h3>
          <p class="t-copy">{{ rt(tile.body) }}</p>
        </article>
        <div class="tile tile-cta">
          <a class="button button-primary" :href="APP_PATH">
            {{ t("home.bento.cta") }}
            <KcqIcon class="button-arrow" name="arrow" />
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.bento {
  display: grid;
  gap: var(--kcq-column-gap);
  margin-top: var(--klc-space-48);
}
.tile {
  display: grid;
  align-content: start;
  gap: var(--klc-space-8);
  padding: var(--klc-space-24);
  border: 1px solid var(--kcq-rule);
  background: var(--kcq-surface);
}
.tile-lead {
  gap: var(--klc-space-12);
}
.sources {
  width: 100%;
  margin-top: var(--klc-space-12);
  border-collapse: collapse;
}
.sources tr {
  border-top: 1px solid var(--kcq-rule);
}
.sources th,
.sources td {
  padding: var(--klc-space-12) 0;
  text-align: left;
  vertical-align: baseline;
}
.sources th {
  width: 9rem;
  padding-right: var(--klc-space-16);
  font-weight: inherit;
}
.sources code {
  font-size: var(--klc-text-13-font-size);
  line-height: var(--klc-text-13-line-height);
  color: var(--kcq-ink);
}
.tile-foot {
  padding-top: var(--klc-space-12);
  border-top: 1px solid var(--kcq-rule);
}
.tile-cta {
  align-content: end;
  background: transparent;
  border-style: dashed;
}
@media (min-width: 768px) {
  .bento {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tile-lead {
    grid-column: 1 / -1;
  }
}
@media (min-width: 1024px) {
  .bento {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: minmax(10rem, auto);
  }
  .tile-lead {
    grid-column: 1 / span 2;
    grid-row: 1 / span 3;
  }
}
</style>
