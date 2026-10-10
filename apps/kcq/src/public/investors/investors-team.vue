<!--
  Team (research §4.10, a16z speedrun "complementary skill sets"): the four people in the business
  plan with the portraits they supplied (KLineChartQuant-BP assets/team), name and role only;
  biographies stay in the deck. Set in one grey so four different studio backdrops read as one row.
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useReveal } from "../home/motion/use-reveal";
import lu320 from "./team/lu-zikai-320.webp";
import lu640 from "./team/lu-zikai-640.webp";
import ma320 from "./team/ma-di-320.webp";
import ma640 from "./team/ma-di-640.webp";
import rao320 from "./team/rao-fangtong-320.webp";
import rao640 from "./team/rao-fangtong-640.webp";
import ye320 from "./team/ye-yangtian-320.webp";
import ye640 from "./team/ye-yangtian-640.webp";

/** Same order as investors.team.members. */
const PORTRAITS = [
  [ye320, ye640],
  [lu320, lu640],
  [ma320, ma640],
  [rao320, rao640],
] as const;

const { t } = useI18n();
/** Reveal: the four people settle in, a quiet scale with no travel (faces, not features). */
const people = ref<HTMLElement>();
const { state } = useReveal(people);
const members = computed(() =>
  PORTRAITS.map(([small, large], index) => {
    const name = t(`investors.team.members.${index}.name`);
    return {
      name,
      role: t(`investors.team.members.${index}.role`),
      focus: t(`investors.team.members.${index}.focus`),
      srcset: `${small} 320w, ${large} 640w`,
      src: large,
      alt: t("investors.team.portrait", { name }),
    };
  }),
);
</script>
<template>
  <section id="team" class="band team" aria-labelledby="team-heading">
    <div class="container">
      <div class="section-head">
        <h2 id="team-heading" class="t-heading">{{ t("investors.team.heading") }}</h2>
        <p class="t-lede">{{ t("investors.team.lede") }}</p>
      </div>
      <ul ref="people" class="people" :data-reveal="state">
        <li v-for="(person, index) in members" :key="person.name" class="person reveal-item" :style="{ '--i': index }">
          <img
            class="person-photo"
            :srcset="person.srcset"
            sizes="(min-width: 1344px) 304px, (min-width: 1024px) 22vw, 45vw"
            :src="person.src"
            :alt="person.alt"
            width="640"
            height="800"
            loading="lazy"
            decoding="async"
          />
          <h3 class="t-title person-name">{{ person.name }}</h3>
          <p class="t-label person-role">{{ person.role }}</p>
          <p class="t-copy">{{ person.focus }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>
<style scoped>
.people {
  --reveal-y: 0px;
  --reveal-scale: 0.98;
  --reveal-stagger: 60ms;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--klc-space-32) var(--kcq-column-gap);
  margin-top: var(--klc-space-48);
}
@media (min-width: 1024px) {
  .people {
    margin-top: var(--klc-space-64);
  }
}
.person {
  display: grid;
  align-content: start;
  gap: var(--klc-space-4);
}
.person-photo {
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  margin-bottom: var(--klc-space-12);
  border-radius: var(--klc-radius-lg);
  background: var(--kcq-control);
  filter: grayscale(1) contrast(1.04);
}
.person-role {
  color: var(--kcq-ink-2);
}
@media (min-width: 1024px) {
  .people {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
