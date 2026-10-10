import type { Metadata, Viewport } from "next";
import type { Lang } from "./i18n";
import { KCQ_ORIGIN } from "./site";

export function layoutMetadata(lang: Lang): Metadata {
  const suffix = lang === "en" ? "KLineChartQuant Docs" : "KLineChartQuant 文档";
  return {
    metadataBase: new URL(KCQ_ORIGIN),
    title: { default: suffix, template: `%s · ${suffix}` },
    description:
      lang === "en"
        ? "Documentation for KLineChartQuant, the agent-native K-line chart: embed it, feed it data, theme it and let an agent operate it."
        : "KLineChartQuant 文档：嵌入图表、接入行情、定制主题，并让 Agent 操作图表。",
    icons: { icon: "/favicon.svg" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
  ],
};
