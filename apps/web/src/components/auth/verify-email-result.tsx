import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { AuthErrorKey } from "@/lib/auth/error-keys";

export interface VerifyEmailResultProps {
  success: boolean;
  /**
   * Localized error key — only meaningful when `success` is false.
   * Defaults to "unknown" when omitted.
   */
  errorKey?: AuthErrorKey;
}

export function VerifyEmailResult({ success, errorKey = "unknown" }: VerifyEmailResultProps) {
  const t = useTranslations("auth.verifyEmail");
  const tErrors = useTranslations("auth.errors");

  if (success) {
    return (
      <section
        aria-live="polite"
        className="rounded-[var(--radius-lg)] border border-border bg-background p-6 text-center"
      >
        <div
          aria-hidden
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--status-success)_15%,transparent)] text-lg text-[color:var(--status-success)]"
        >
          ✓
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">{t("successTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("successDescription")}</p>
        <div className="mt-5">
          <Button asChild variant="ink">
            <Link href="/">{t("continueCta")}</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      className="rounded-[var(--radius-lg)] border border-border bg-background p-6 text-center"
    >
      <div
        aria-hidden
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--status-warning)_15%,transparent)] text-lg text-[color:var(--status-warning)]"
      >
        ⚠
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{t("failureTitle")}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{t("failureDescription")}</p>
      <p className="mt-1 text-sm text-[hsl(var(--destructive))]" role="alert">
        {tErrors(errorKey)}
      </p>
      <div className="mt-5">
        <Link
          href="/sign-in"
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          {t("signInCta")}
        </Link>
      </div>
    </section>
  );
}
