import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { ArrowLeft } from "@nebutra/icons";
import { AUTH_FORM_CARD_CLASS, AUTH_FORM_COLUMN_CLASS } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import { AuthBanner } from "./auth-banner";
import { LocaleSwitcher } from "./locale-switcher";

/**
 * Same split shell as apps/web AuthSplitLayout (Agent OS login) —
 * including top-right locale switcher.
 *
 * Form column width is SSOT via AUTH_FORM_COLUMN_CLASS (@nebutra/ui/utils) —
 * do not reintroduce a magic pixel max-width on this shell.
 */
export async function AuthSplitLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const t = await getTranslations("auth.signIn");
  // Not NEXT_PUBLIC_SITE_URL. It is meant to be the marketing origin, but the
  // deployed auth center answers with its own host, so this link pointed back
  // at the page the visitor was already on. The marketing home is a brand fact
  // rather than a per-deployment one, so read it from the domains map — which
  // also retires the hardcoded fallback this file carried a brand-exempt
  // comment for.
  const homeHref = getBrandOrigin("landing");

  return (
    <div
      className={cn(
        "grid min-h-screen bg-background lg:grid-cols-[minmax(360px,36vw)_1fr]",
        className,
      )}
    >
      <AuthBanner />
      <main
        id="main-content"
        className="relative flex min-h-[100svh] flex-col items-center justify-center px-5 py-20 sm:px-8 lg:px-16"
      >
        <a
          href={homeHref}
          className="absolute left-5 top-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--primary))] sm:left-8 lg:left-12 lg:top-10"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("homeLink")}
        </a>
        {/* z-20: locale panel must paint above password visibility toggle + fields */}
        <div className="absolute right-5 top-6 z-20 sm:right-8 lg:right-12 lg:top-10">
          <LocaleSwitcher />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,color-mix(in_srgb,hsl(var(--muted))_80%,transparent),transparent)] lg:hidden"
        />
        <div className={cn(AUTH_FORM_COLUMN_CLASS, AUTH_FORM_CARD_CLASS)}>{children}</div>
      </main>
    </div>
  );
}
