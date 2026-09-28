import { useTranslations } from "next-intl";
import { NotFoundPanel } from "@/components/landing/404/not-found-panel";
import { SiteShell } from "@/site-shell";

/** A missing page wears the site's own frame — the rail or the top nav — like any other page. */
export default function LocalizedNotFound() {
  const t = useTranslations("notFound");

  return (
    <SiteShell>
      <main id="main-content" className="flex flex-1 flex-col justify-center">
        <NotFoundPanel
          title={t("title")}
          desc={t("desc")}
          homeText={t("home")}
          docsText={t("docs")}
        />
      </main>
    </SiteShell>
  );
}
