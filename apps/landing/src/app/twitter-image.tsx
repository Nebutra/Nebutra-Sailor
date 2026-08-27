import { brand, colors } from "@nebutra/brand/metadata";
import { ImageResponse } from "next/og";

export const runtime = "edge";

// Satori does NOT resolve CSS var() — all colors must be explicit hex/rgba values
// sourced from @nebutra/brand/metadata colors object.
const BG = colors.neutral["950"]; // "#020617"
const GLOW_A = `rgba(0,51,254,0.27)`; // colors.primary["500"] at 27% opacity
const GLOW_B = `rgba(11,241,195,0.20)`; // colors.accent["500"] at 20% opacity

export const alt = `${brand.name} Sailor - Enterprise SaaS Framework`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BG,
        backgroundImage: `radial-gradient(ellipse 76% 48% at 50% 40%, ${GLOW_A} 0%, transparent 72%), radial-gradient(ellipse 58% 35% at 70% 72%, ${GLOW_B} 0%, transparent 75%)`,
      }}
    >
      <span
        style={{
          fontSize: 24,
          color: "rgba(255,255,255,0.74)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 22,
        }}
      >
        {brand.name} Sailor
      </span>
      <span
        style={{
          fontSize: 74,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "-0.03em",
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        Open-Source Enterprise SaaS
      </span>
      <span
        style={{
          fontSize: 30,
          color: "#a7f7e4",
          textAlign: "center",
          marginTop: 14,
        }}
      >
        Build faster with multi-tenant + billing + AI foundations
      </span>
    </div>,
    { ...size },
  );
}
