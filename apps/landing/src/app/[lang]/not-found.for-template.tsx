import { Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SiteShell } from "@/site-shell";

/** A page that does not exist, inside the site's own frame, with the way home. */
export default function LocalizedNotFound() {
  const t = useTranslations("notFound");

  return (
    <SiteShell>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-32 pb-24 text-center">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-md text-pretty text-muted-foreground">{t("desc")}</p>
        <Button asChild className="mt-8" variant="ink">
          <Link href="/">{t("home")}</Link>
        </Button>
      </main>
    </SiteShell>
  );
}
