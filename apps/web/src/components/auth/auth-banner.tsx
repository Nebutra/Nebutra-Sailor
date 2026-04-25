import { cn } from "@nebutra/ui/utils";
import Image from "next/image";

interface AuthBannerProps {
  className?: string;
}

export function AuthBanner({ className }: AuthBannerProps) {
  return (
    <aside
      className={cn(
        "relative isolate hidden min-h-[100svh] overflow-hidden border-r border-[var(--neutral-7)] bg-[var(--neutral-2)] lg:flex",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          background:
            "linear-gradient(150deg, color-mix(in srgb, var(--cyan-9) 10%, var(--neutral-1)) 0%, var(--neutral-1) 42%, color-mix(in srgb, var(--blue-9) 10%, var(--neutral-1)) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-12 -z-20 blur-2xl saturate-150"
        style={{
          background:
            "radial-gradient(120% 92% at -18% 0%, color-mix(in srgb, var(--cyan-9) 30%, transparent) 0%, transparent 62%), radial-gradient(118% 96% at 112% 104%, color-mix(in srgb, var(--blue-9) 18%, transparent) 0%, transparent 64%), linear-gradient(145deg, color-mix(in srgb, var(--blue-9) 9%, transparent), transparent 48%, color-mix(in srgb, var(--cyan-9) 12%, transparent))",
          opacity: 1,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.24]"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--neutral-12) 46%, transparent) 1px, transparent 1.5px), linear-gradient(90deg, color-mix(in srgb, var(--neutral-12) 8%, transparent) 1px, transparent 1px), linear-gradient(0deg, color-mix(in srgb, var(--neutral-12) 8%, transparent) 1px, transparent 1px)",
          backgroundSize: "18px 18px, 92px 92px, 92px 92px",
          maskImage:
            "linear-gradient(90deg, black 0%, rgba(0,0,0,0.92) 58%, rgba(0,0,0,0.36) 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, black 0%, rgba(0,0,0,0.92) 58%, rgba(0,0,0,0.36) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, transparent 58%, color-mix(in srgb, var(--neutral-1) 34%, transparent) 100%), linear-gradient(0deg, color-mix(in srgb, var(--neutral-1) 24%, transparent) 0%, transparent 40%, color-mix(in srgb, var(--neutral-1) 12%, transparent) 100%)",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center justify-center px-12 text-center">
        <Image
          src="/brand/logo-color.svg"
          alt="Nebutra"
          width={68}
          height={64}
          className="mb-8 h-20 w-auto drop-shadow-[0_20px_54px_color-mix(in_srgb,var(--blue-9)_24%,transparent)]"
          priority
        />
        <h2 className="max-w-[20rem] text-balance text-3xl font-semibold leading-tight tracking-tight text-[var(--neutral-12)]">
          Build governed AI products without slowing down.
        </h2>
      </div>
    </aside>
  );
}
