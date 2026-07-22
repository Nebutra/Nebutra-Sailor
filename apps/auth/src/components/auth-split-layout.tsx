import { cn } from "@/lib/cn";
import { AuthBanner } from "./auth-banner";

/**
 * Same split shell as apps/web AuthSplitLayout (Agent OS login).
 * No @nebutra/icons / next-intl — keeps standalone ECS bundle self-contained.
 */
export function AuthSplitLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const homeHref = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nebutra.com";

  return (
    <div
      className={cn(
        "grid min-h-screen bg-[var(--neutral-1)] lg:grid-cols-[minmax(360px,36vw)_1fr]",
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
          className="absolute left-5 top-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--blue-9)] sm:left-8 lg:left-12 lg:top-10"
        >
          <span aria-hidden className="inline-block text-base leading-none">
            ←
          </span>
          Home
        </a>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--neutral-2)_80%,transparent),transparent)] lg:hidden"
        />
        <div className="relative w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
