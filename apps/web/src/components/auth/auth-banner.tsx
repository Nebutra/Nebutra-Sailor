import { cn } from "@nebutra/ui/utils";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface AuthBannerProps {
  className?: string;
}

/**
 * Sign-in left panel — Pattern A (editorial silence).
 * Brand mark + slogan + tagline anchored top-left, footer mark bottom-left.
 * The gradient + dot grid carry the visual weight; no trust-badge checklist,
 * no compliance acronyms. Inspired by Vercel / Plain / Notion 2026.
 */
export function AuthBanner({ className }: AuthBannerProps) {
  const t = useTranslations("auth.banner");

  return (
    <aside
      className={cn(
        "relative isolate hidden min-h-[100svh] overflow-hidden border-r border-border bg-muted lg:flex",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          background:
            "linear-gradient(150deg, color-mix(in srgb, var(--cyan-9) 10%, hsl(var(--background))) 0%, hsl(var(--background)) 42%, color-mix(in srgb, hsl(var(--primary)) 10%, hsl(var(--background))) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-12 -z-20 blur-2xl saturate-150"
        style={{
          background:
            "radial-gradient(120% 92% at -18% 0%, color-mix(in srgb, var(--cyan-9) 30%, transparent) 0%, transparent 62%), radial-gradient(118% 96% at 112% 104%, color-mix(in srgb, hsl(var(--primary)) 18%, transparent) 0%, transparent 64%), linear-gradient(145deg, color-mix(in srgb, hsl(var(--primary)) 9%, transparent), transparent 48%, color-mix(in srgb, var(--cyan-9) 12%, transparent))",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, hsl(var(--foreground)) 46%, transparent) 1px, transparent 1.5px), linear-gradient(90deg, color-mix(in srgb, hsl(var(--foreground)) 8%, transparent) 1px, transparent 1px), linear-gradient(0deg, color-mix(in srgb, hsl(var(--foreground)) 8%, transparent) 1px, transparent 1px)",
          backgroundSize: "20px 20px, 100px 100px, 100px 100px",
          maskImage:
            "linear-gradient(180deg, black 0%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.3) 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, black 0%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-start justify-between px-14 py-20 xl:px-20 xl:py-24">
        <div className="flex max-w-[28rem] flex-col items-start">
          <Image
            src="/brand/logo-color.svg"
            alt={t("logoAlt")}
            width={72}
            height={72}
            className="mb-10 h-12 w-auto drop-shadow-[0_18px_44px_color-mix(in_srgb,hsl(var(--primary))_22%,transparent)]"
            priority
          />
          <h2 className="text-balance text-[clamp(28px,3.2vw,40px)] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">
            {t("slogan")}
          </h2>
          <p className="mt-4 max-w-[24rem] text-balance text-[15px] leading-[1.6] text-muted-foreground">
            {t("tagline")}
          </p>
        </div>

        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          © {new Date().getFullYear()} Nebutra
        </div>
      </div>
    </aside>
  );
}
