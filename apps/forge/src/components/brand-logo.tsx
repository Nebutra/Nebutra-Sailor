/**
 * Product chrome brand mark (Forge) — 图形 / 文字解耦.
 *
 * Light: VI multi-path `logo-color.svg` + independent wordmark (neutral ink).
 * Dark: mono LogomarkSVG white + same wordmark white.
 *
 * Layout is always a horizontal flex row. Callers may pass size / visibility
 * classes (`h-*`, `hidden`, `sm:inline-flex`) but must not pass `sm:block` —
 * that overrides `inline-flex` and stacks mark above wordmark.
 */

import { LogomarkSVG, WordmarkEnSVG } from "@nebutra/brand";
import logoColorMark from "@nebutra/brand/assets/logo/logo-color.svg";
import { cn } from "@nebutra/ui/utils";
import Image from "next/image";

const logoColorMarkSrc =
  typeof logoColorMark === "string" ? logoColorMark : (logoColorMark as { src: string }).src;

export function BrandLogo({
  variant = "horizontal",
  className,
}: {
  variant?: "horizontal" | "mark";
  className?: string;
}) {
  return (
    <span
      className={cn(
        // flex-row last among display utilities via ! so caller `sm:block` cannot stack
        "inline-flex shrink-0 flex-row items-center gap-[0.35em] sm:!inline-flex",
        className,
      )}
      data-brand-asset={variant}
      data-brand-source="@nebutra/brand/decoupled"
    >
      <Image
        src={logoColorMarkSrc}
        alt=""
        width={32}
        height={30}
        className="h-full w-auto shrink-0 dark:hidden"
        unoptimized
        aria-hidden
      />
      <LogomarkSVG
        width={32}
        height={32}
        className="hidden h-full w-auto shrink-0 !text-white dark:block"
      />
      {variant === "horizontal" ? (
        <WordmarkEnSVG
          width={110}
          className="h-[70%] w-auto shrink-0 self-center !text-[var(--neutral-12)] dark:!text-white"
        />
      ) : null}
    </span>
  );
}
