<!--
  Open source and community (landing-benchmark §6.8: the OSS form of social proof is the work and
  the channels, not logos). The zh page lists the QQ group first, the en page Telegram first.
-->
<script setup lang="ts">
import facts from "virtual:kcq-facts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import KcqIcon from "../components/kcq-icon.vue";

const { t, locale } = useI18n();
const channels = computed(() => {
  const github = { key: "github", href: facts.upstream };
  const telegram = { key: "telegram", href: "https://t.me/+1o-6B-wVRTU2MjQ9" };
  const qq = { key: "qq", href: "https://qm.qq.com/q/672011965" };
  return locale.value === "zh" ? [github, qq, telegram] : [github, telegram, qq];
});
</script>
<template>
  <section id="community" class="section" aria-labelledby="community-heading">
    <div class="container community-grid">
      <p class="eyebrow t-meta"><span class="eyebrow-index t-num">07</span>{{ t("home.community.eyebrow") }}</p>
      <div class="section-head community-head">
        <h2 id="community-heading" class="t-heading">{{ t("home.community.heading") }}</h2>
        <p class="t-lede">{{ t("home.community.body") }}</p>
      </div>
      <ul class="channels">
        <li v-for="channel in channels" :key="channel.key">
          <a class="channel" :href="channel.href" rel="noopener">
            <span class="t-title">{{ t(`home.community.${channel.key}.name`) }}</span>
            <span class="t-copy">{{ t(`home.community.${channel.key}.detail`) }}</span>
            <KcqIcon class="channel-arrow" name="external" />
          </a>
        </li>
      </ul>
      <div class="release">
        <dl class="release-pair">
          <dt class="t-meta">{{ t("home.community.version") }}</dt>
          <dd class="t-num release-version" translate="no">{{ facts.version }}</dd>
        </dl>
        <p class="t-copy">{{ t("home.community.next") }}</p>
      </div>
    </div>
  </section>
</template>
<style scoped>
.community-grid {
  display: grid;
  --row-gap: var(--klc-space-48);
  gap: var(--row-gap) var(--kcq-column-gap);
}
.channels {
  display: grid;
  border-top: 1px solid var(--kcq-rule);
}
.channel {
  position: relative;
  display: grid;
  gap: var(--klc-space-4);
  padding: var(--klc-space-24) var(--klc-space-48) var(--klc-space-24) 0;
  border-bottom: 1px solid var(--kcq-rule);
  color: var(--kcq-ink);
  text-decoration: none;
}
.channel .t-copy {
  font-family: var(--kcq-font-mono);
}
.channel-arrow {
  position: absolute;
  right: var(--klc-space-8);
  top: 50%;
  translate: 0 -50%;
  color: var(--kcq-ink-2);
  transition: transform var(--klc-motion-dur-fast) var(--klc-motion-ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .channel:hover .t-title {
    color: var(--kcq-accent-text);
  }
  .channel:hover .channel-arrow {
    transform: translate(2px, -2px);
    color: var(--kcq-ink);
  }
}
.release {
  display: grid;
  gap: var(--klc-space-8);
  align-content: start;
  padding-top: var(--klc-space-24);
  border-top: 1px solid var(--kcq-rule);
}
.release-pair {
  display: grid;
  gap: var(--klc-space-4);
}
.release-version {
  font-size: var(--klc-text-24-font-size);
  line-height: var(--klc-text-24-line-height);
}
@media (min-width: 1024px) {
  .community-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }
  .community-head {
    grid-column: 1 / span 5;
  }
  .channels {
    grid-column: 6 / span 4;
  }
  .release {
    grid-column: 11 / span 2;
  }
}
</style>
