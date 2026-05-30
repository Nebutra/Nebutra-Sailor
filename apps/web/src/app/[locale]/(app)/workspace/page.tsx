import { ArrowRight, Connection as Plug, Sparkles } from "@nebutra/icons";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getUser } from "@/lib/auth";

// =============================================================================
// /workspace — Home (hero landing inside the dashboard)
// =============================================================================
// A centered greeting + a faux prompt card sit on a soft brand-tinted gradient
// canvas. Mirrors the visual rhythm of the marketing-app builder homes (big
// title, single input, top utility pill). The prompt card is decorative for
// now — clicking it opens the command palette.
// =============================================================================

type GreetingKey = "morning" | "afternoon" | "evening";

function getGreetingKey(): GreetingKey {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

export default async function WorkspaceHomePage() {
  const [t, user] = await Promise.all([getTranslations("dashboard"), getUser().catch(() => null)]);

  const firstName = user?.name?.split(" ")[0] || "there";
  const greeting = t(`greeting.${getGreetingKey()}`);

  return (
    <div data-dashboard-section="workspace-home" className="relative">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-16 pb-24 text-center sm:pt-24">
        {/* Top pill — quick promo / context-setter */}
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur-md transition-colors hover:bg-background hover:text-foreground"
        >
          <Plug className="size-3.5" aria-hidden="true" />
          {t("home.connectorsPill")}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>

        {/* Greeting */}
        <h1 className="mt-10 text-balance font-semibold text-3xl text-foreground sm:text-4xl md:text-5xl">
          {greeting}, {firstName}.
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
          {t("home.subtitle")}
        </p>

        {/* Faux prompt card — clicking opens ⌘K command palette */}
        <PromptCard placeholder={t("home.promptPlaceholder")} />

        {/* Quick action chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {[
            { label: t("home.actions.connect"), href: "/integrations" },
            { label: t("home.actions.theme"), href: "/theme-playground" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur-md transition-colors hover:bg-background hover:text-foreground"
            >
              <Sparkles className="size-3" aria-hidden="true" />
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Prompt card (client) ────────────────────────────────────────────────────

function PromptCard({ placeholder }: { placeholder: string }) {
  return (
    <div className="mt-8 w-full max-w-2xl">
      <div className="rounded-[var(--radius-2xl)] bg-background/90 p-4 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <p className="px-2 py-2 text-left text-[15px] text-muted-foreground">{placeholder}</p>
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Open command palette"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            ⌘K
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
