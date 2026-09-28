import { brand } from "@nebutra/brand/metadata";
import { FullPageStatus } from "@nebutra/ui/layout";
import { SITE_BRAND } from "@/site-theme";
import { fontVariables } from "./fonts";

// Global fallback for non-localized paths that don't match a locale (e.g. /wrong).
// The root layout (app/layout.tsx) is a passthrough that renders no <html>/<body>,
// so this global 404 owns its own document shell — and wears the site's Brand
// Package like every other page (site-theme.ts). Localized 404s render inside
// app/[lang]/layout.tsx's <html lang={locale}> instead.
export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      className={`${fontVariables} min-h-dvh antialiased`}
      data-brand={SITE_BRAND}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <FullPageStatus
          code="404"
          title="Page Not Found"
          description="The link may be outdated, or the page may have moved."
          primaryAction={{ label: `Back to ${brand.name}`, href: "/" }}
          secondaryAction={{ label: "Open docs", href: "/docs" }}
        />
      </body>
    </html>
  );
}
