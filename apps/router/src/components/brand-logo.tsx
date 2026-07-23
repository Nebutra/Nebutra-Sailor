/**
 * Product chrome brand mark — mirrors apps/web BrandLogo conventions.
 * Assets live under /public/brand (synced via `pnpm brand:sync`).
 * Server-safe: no client-only utils (cn).
 */

const ASSETS = {
  mark: {
    src: "/brand/logo-color.svg",
    width: 550,
    height: 513,
  },
  horizontal: {
    src: "/brand/logo-horizontal-en.svg",
    width: 1062,
    height: 208,
  },
} as const;

export function BrandLogo({
  variant = "horizontal",
  className,
}: {
  variant?: "horizontal" | "mark";
  className?: string;
}) {
  const asset = ASSETS[variant];
  return (
    <span
      className={["inline-flex shrink-0 items-center", className].filter(Boolean).join(" ")}
      data-brand-asset={variant}
      data-brand-source="packages/design/brand"
    >
      {/* biome-ignore lint/performance/noImgElement: brand SVG from public/brand SSOT */}
      <img
        src={asset.src}
        alt=""
        width={asset.width}
        height={asset.height}
        draggable={false}
        aria-hidden="true"
        className="block h-full w-full object-contain"
      />
    </span>
  );
}
