import { ImageResponse } from "next/og";
import type * as React from "react";
import { type CSSProperties, createElement, type ReactNode } from "react";
import { z } from "zod";

// Route segment `runtime = "edge"` removed: incompatible with the project's
// `cacheComponents: true` (Next 16 PPR). next/og's ImageResponse runs fine on
// the Node runtime; OG generation latency is dominated by Satori, not by edge
// vs node startup, so this has negligible user-visible impact.

const querySchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional(),
  theme: z.enum(["light", "dark"]).optional().default("dark"),
});

const SIZE = { width: 1200, height: 630 } as const;

const CACHE_HEADER = {
  "cache-control": "public, immutable, no-transform, s-maxage=31536000, max-age=31536000",
} as const;

const themePalette = {
  dark: {
    bg: "#141413",
    grid: "rgba(250,249,245,0.045)",
    panel: "rgba(250,249,245,0.045)",
    border: "rgba(250,249,245,0.13)",
    title: "#faf9f5",
    subtitle: "rgba(250,249,245,0.72)",
    muted: "rgba(250,249,245,0.56)",
    accent: "#7aa7ff",
  },
  light: {
    bg: "#faf9f5",
    grid: "rgba(20,20,19,0.055)",
    panel: "rgba(255,255,255,0.58)",
    border: "rgba(20,20,19,0.14)",
    title: "#141413",
    subtitle: "rgba(20,20,19,0.68)",
    muted: "rgba(20,20,19,0.52)",
    accent: "#0033FE",
  },
} as const;

type Palette = (typeof themePalette)[keyof typeof themePalette];

function div(style: CSSProperties, children?: ReactNode) {
  return createElement("div", { style }, children);
}

function buildOgTree(title: string, subtitle: string | undefined, palette: Palette): ReactNode {
  const containerStyle: CSSProperties = {
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "72px",
    backgroundColor: palette.bg,
  };

  const gridStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundImage: `linear-gradient(${palette.grid} 1px, transparent 1px), linear-gradient(90deg, ${palette.grid} 1px, transparent 1px)`,
    backgroundSize: "48px 48px",
    display: "flex",
  };

  const panelStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    border: `1px solid ${palette.border}`,
    backgroundColor: palette.panel,
    padding: "56px",
  };

  const brandStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    color: palette.muted,
    fontSize: "24px",
    fontWeight: 600,
    letterSpacing: "0",
  };

  const titleStyle: CSSProperties = {
    display: "flex",
    color: palette.title,
    fontSize: "78px",
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: "-0.02em",
    marginTop: "24px",
    maxWidth: "1040px",
  };

  const subtitleStyle: CSSProperties = {
    display: "flex",
    color: palette.subtitle,
    fontSize: "32px",
    fontWeight: 400,
    lineHeight: 1.35,
    marginTop: "20px",
    maxWidth: "1040px",
  };

  return div(containerStyle, [
    div(gridStyle),
    createElement("div", { key: "panel", style: panelStyle }, [
      createElement("div", { key: "brand", style: brandStyle }, [
        createElement("span", { key: "name" }, "Nebutra"),
        createElement("span", { key: "dot", style: { color: palette.accent } }, "Blog"),
      ]),
      createElement("div", { key: "copy", style: { display: "flex", flexDirection: "column" } }, [
        createElement("div", { key: "title", style: titleStyle }, title),
        subtitle ? createElement("div", { key: "subtitle", style: subtitleStyle }, subtitle) : null,
      ]),
      createElement("div", {
        key: "rule",
        style: {
          display: "flex",
          height: "6px",
          width: "148px",
          backgroundColor: palette.accent,
        },
      }),
    ]),
  ]);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    title: url.searchParams.get("title") ?? undefined,
    subtitle: url.searchParams.get("subtitle") ?? undefined,
    theme: url.searchParams.get("theme") ?? undefined,
  });

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid OG image params",
        issues: parsed.error.issues,
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const { title, subtitle, theme } = parsed.data;
  const palette = themePalette[theme];

  // ImageResponse expects a ReactElement; our tree is constructed via
  // createElement so the cast is safe.
  return new ImageResponse(buildOgTree(title, subtitle, palette) as React.ReactElement, {
    ...SIZE,
    headers: { ...CACHE_HEADER },
  });
}
