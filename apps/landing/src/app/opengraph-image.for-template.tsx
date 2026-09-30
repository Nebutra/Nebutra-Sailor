import { brand, colors } from "@nebutra/brand/metadata";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import enMessages from "../../messages/en.json";

// The link-preview card: your brand's name and pitch (messages/en.json ->
// site.meta / site.hero). Satori does not resolve CSS var(), so colours are
// explicit.

export const alt = enMessages.site.meta.title.replaceAll("{brandName}", brand.name);
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const t = await getTranslations({ locale: "en", namespace: "site.hero" });
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        backgroundColor: colors.neutral["950"],
        backgroundImage:
          "radial-gradient(ellipse 70% 60% at 20% 0%, rgba(255,255,255,0.10) 0%, transparent 70%)",
        color: "white",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.85)",
            fontSize: 36,
            fontWeight: 600,
          }}
        >
          {brand.name.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 36, fontWeight: 600 }}>{brand.name}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
          {t("pitch")}
        </span>
        <span style={{ fontSize: 28, color: "rgba(255,255,255,0.6)" }}>
          {brand.domains.landing}
        </span>
      </div>
    </div>,
    { ...size },
  );
}
