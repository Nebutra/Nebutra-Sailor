import { cn } from "@nebutra/ui/utils";
import Link from "next/link";

interface AuthBannerProps {
  className?: string;
}

export function AuthBanner({ className }: AuthBannerProps) {
  return (
    <div
      className={cn(
        "relative hidden overflow-hidden lg:flex lg:flex-col",
        "bg-[color:var(--neutral-1)]",
        className,
      )}
    >
      {/* Decorative radial gradient glow — bottom-right origin */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 100% 100%, color-mix(in srgb, var(--brand-primary) 35%, transparent) 0%, color-mix(in srgb, var(--brand-accent) 18%, transparent) 40%, transparent 70%)",
        }}
      />

      {/* Halftone dot grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--neutral-12) 60%, transparent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Top-left Home link */}
      <div className="relative z-10 p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Home
        </Link>
      </div>

      {/* Center branding */}
      <div className="relative z-10 flex flex-1 flex-col items-start justify-center px-12 pb-16">
        {/* Nebutra Logo */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-xl)] bg-[color:var(--blue-9)]">
            <span className="text-lg font-black text-white">N</span>
          </div>
          <span className="text-2xl font-bold text-white">Nebutra</span>
        </div>

        {/* Tagline */}
        <p className="max-w-xs text-xl font-semibold leading-snug text-white">
          Build faster with AI-native infrastructure.
        </p>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/50">
          Enterprise-grade AI, without the enterprise complexity.
        </p>
      </div>
    </div>
  );
}
