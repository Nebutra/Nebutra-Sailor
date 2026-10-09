<!--
  Purpose (research investors-page.md §4.1): one sentence with the product as subject, a literal
  lede, the stage stated as intent, one primary action. The visual is the thesis already working:
  the team's own screenshot of the 601360 session (BP asset agent-box-range-601360, 2026-09-04),
  where an agent boxed a year of consolidation ranges on the chart. Static: the page's one motion
  is the tool-call log further down. On phones the shot crops to the chart, the part that reads.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";
import { APP_PATH } from "../routes";
import { mailtoHref } from "./contact";
import session960 from "./shots/agent-601360-960.webp";
import session1920 from "./shots/agent-601360-1920.webp";
import square480 from "./shots/agent-601360-square-480.webp";
import square720 from "./shots/agent-601360-square-720.webp";

const { t } = useI18n();
</script>
<template>
  <section id="hero" class="band hero" aria-labelledby="hero-heading">
    <div class="container">
      <div class="hero-grid">
        <p class="t-meta hero-kicker">
          <span class="hero-kicker-mark" aria-hidden="true" />{{ t("investors.hero.kicker") }}
        </p>
        <h1 id="hero-heading" class="t-display hero-heading">{{ t("investors.heading") }}</h1>
        <p class="t-lede hero-lede">{{ t("investors.hero.lede") }}</p>
        <div class="hero-ask">
          <p class="t-copy hero-stage">{{ t("investors.hero.stage") }}</p>
          <div class="hero-actions">
            <a
              class="button button-primary"
              :href="mailtoHref(t('investors.ask.investors.subject'), t('investors.ask.mailBody'))"
            >
              {{ t("investors.hero.primary") }}
              <KcqIcon class="button-arrow" name="arrow" />
            </a>
            <a class="button button-quiet" :href="APP_PATH">{{ t("investors.hero.secondary") }}</a>
          </div>
        </div>
      </div>
      <figure class="session">
        <div class="session-frame">
          <picture>
            <source
              media="(max-width: 767px)"
              :srcset="`${square480} 480w, ${square720} 720w`"
              sizes="calc(100vw - 32px)"
            />
            <img
              :srcset="`${session960} 960w, ${session1920} 1920w`"
              sizes="(min-width: 1344px) 1280px, calc(100vw - 64px)"
              :src="session1920"
              :alt="t('investors.session.alt')"
              width="1920"
              height="930"
              decoding="async"
            />
          </picture>
        </div>
        <figcaption class="session-caption">
          <span class="t-meta session-label" translate="no">{{ t("investors.session.label") }}</span>
          <span class="t-copy">{{ t("investors.session.caption") }}</span>
        </figcaption>
      </figure>
    </div>
  </section>
</template>
<style scoped>
.hero {
  padding-block: var(--klc-space-32) var(--kcq-band-space);
}
@media (min-width: 1024px) {
  .hero {
    padding-top: var(--klc-space-64);
  }
}
.hero-grid {
  display: grid;
  gap: var(--klc-space-24);
}
.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: var(--klc-space-8);
}
/* The candle-body mark the chart uses for a price label, as the kicker's bullet. */
.hero-kicker-mark {
  width: var(--klc-space-4);
  height: var(--klc-space-12);
  border-radius: 1px;
  background: var(--kcq-accent);
}
.hero-heading {
  max-width: 20ch;
}
/* Phones: the product name is one unbreakable word; keep it inside the gutter. */
@media (max-width: 767px) {
  :root:not(:lang(zh-Hans)) .hero-heading {
    font-size: min(var(--klc-text-48-font-size), 10.6vw);
  }
}
.hero-lede {
  max-width: 42rem;
}
.hero-ask {
  display: grid;
  gap: var(--klc-space-16);
  align-content: start;
}
.hero-stage {
  max-width: 30rem;
  color: var(--kcq-ink);
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--klc-space-12);
}
/* From lg the lede and the ask sit side by side under the headline, the ask on the right edge. */
@media (min-width: 1024px) {
  .hero-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: var(--kcq-column-gap);
    row-gap: var(--klc-space-32);
  }
  .hero-kicker,
  .hero-heading {
    grid-column: 1 / -1;
  }
  .hero-lede {
    grid-column: 1 / span 6;
  }
  .hero-ask {
    grid-column: 8 / span 5;
    padding-top: var(--klc-space-4);
  }
}
.session {
  margin: var(--klc-space-48) 0 0;
}
@media (min-width: 1024px) {
  .session {
    margin-top: var(--klc-space-64);
  }
}
.session-frame {
  border: 1px solid var(--kcq-rule);
  border-radius: var(--klc-radius-lg);
  overflow: hidden;
  background: var(--kcq-deep);
  box-shadow: var(--klc-elevation-3);
}
.session-frame img {
  display: block;
  width: 100%;
  height: auto;
  user-select: none;
}
.session-caption {
  display: grid;
  gap: var(--klc-space-8);
  max-width: 48rem;
  margin-top: var(--klc-space-16);
}
.session-label {
  color: var(--kcq-accent-text);
}
@media (min-width: 1024px) {
  .session-caption {
    grid-template-columns: max-content minmax(0, 1fr);
    align-items: baseline;
    gap: var(--klc-space-24);
    max-width: 64rem;
  }
}
/* Phones get a square crop of the chart with its boxes (the <source> above): the whole window is
   too small to read there. The box is square before the image arrives, so nothing shifts. */
@media (max-width: 767px) {
  .session-frame img {
    aspect-ratio: 1 / 1;
  }
  /* The caption leads on phones: it names the session before the crop shows it. */
  .session {
    display: flex;
    flex-direction: column;
  }
  .session-caption {
    order: -1;
    margin: 0 0 var(--klc-space-16);
  }
}
</style>
