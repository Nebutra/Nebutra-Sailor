/**
 * Product chrome brand mark (Forge) — 图形 / 文字解耦.
 *
 * Light: VI multi-path `logo-color.svg` + independent wordmark (neutral ink).
 * Dark: mono LogomarkSVG white + same wordmark white.
 *
 * Do NOT use LogoEnSVG alone — it defaults to `text-brand-mark` so mark and
 * wordmark both lock pure brand blue (see docs/ops lessons + brand README).
 */

import { LogomarkSVG, WordmarkEnSVG } from "@nebutra/brand";
import logoColorMark from "@nebutra/brand/assets/logo/logo-color.svg";
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
      className={["inline-flex shrink-0 items-center gap-[0.35em]", className]
        .filter(Boolean)
        .join(" ")}
      data-brand-asset={variant}
      data-brand-source="@nebutra/brand/decoupled"
    >
      <Image
        src={logoColorMarkSrc}
        alt=""
        width={32}
        height={30}
        className="h-full w-auto dark:hidden"
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
          className="h-[70%] w-auto self-center !text-[var(--neutral-12)] dark:!text-white"
        />
      ) : null}
    </span>
  );
}
