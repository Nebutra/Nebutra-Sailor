"use client";

import { usePathname } from "fumadocs-core/framework";
import { type Lang, LOCALES, switchLanguage, UI } from "@/lib/i18n";
import { APP_PATH, FACTS, LINKS } from "@/lib/site";
import { ArrowIcon, GlobeIcon, StarIcon } from "./icons";

/**
 * Header actions, matching kcq.nebutra.com: GitHub with its dated star count, the language
 * switch (a real link to the same page in the other language) and the workstation.
 */
export function HeaderLinks({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const t = UI[lang];
  const other: Lang = lang === "en" ? "zh" : "en";
  const stars = t.stars(FACTS.stars, FACTS.starsFetchedAt);
  return (
    <div className="kcq-header-links">
      <a
        className="kcq-nav-link kcq-github"
        href={LINKS.github}
        rel="noopener"
        aria-label={`${t.github}, ${stars}`}
      >
        {t.github}
        <span className="kcq-stars" aria-hidden="true">
          <StarIcon width={12} height={12} />
          {FACTS.stars}
        </span>
      </a>
      <a
        className="kcq-nav-link"
        href={switchLanguage(pathname, other)}
        hrefLang={LOCALES[other].hreflang}
        lang={LOCALES[other].htmlLang}
        aria-label={`${t.chooseLanguage}: ${LOCALES[other].label}`}
      >
        <GlobeIcon />
        {LOCALES[other].short}
      </a>
      <a className="kcq-button kcq-button-primary" href={APP_PATH}>
        {t.workstation}
        <ArrowIcon />
      </a>
    </div>
  );
}
