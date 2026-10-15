import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import type { Metadata } from "next";
import { docsPath, type Lang, UI } from "@/lib/i18n";
import { ArrowIcon } from "./icons";

/** Rendered once per language; scripts/postbuild.mjs serves it as docs/404.html (nginx error_page). */
export function notFoundMetadata(lang: Lang): Metadata {
  return { title: UI[lang].notFoundTitle, robots: { index: false, follow: true } };
}

export function DocsNotFound({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <DocsPage toc={[]} footer={{ enabled: false }} breadcrumb={{ enabled: false }}>
      <DocsTitle>{t.notFoundTitle}</DocsTitle>
      <DocsBody>
        <p>{t.notFoundBody}</p>
        <p>
          <a className="kcq-button kcq-button-primary kcq-not-found-link" href={docsPath(lang)}>
            {t.notFoundHome}
            <ArrowIcon />
          </a>
        </p>
      </DocsBody>
    </DocsPage>
  );
}
