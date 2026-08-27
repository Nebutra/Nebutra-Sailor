import { brand, colors } from "@nebutra/brand/metadata";
import { ImageResponse } from "next/og";
import { seoContent } from "@/lib/landing-content";

export const runtime = "edge";

export const alt = seoContent.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori does NOT resolve CSS var() — all colors must be explicit hex/rgba values
// sourced from @nebutra/brand/metadata colors object.
const BG = colors.neutral["950"]; // "#020617"
const GLOW_A = `rgba(0,51,254,0.28)`; // colors.primary["500"] at 28% opacity
const GLOW_B = `rgba(11,241,195,0.22)`; // colors.accent["500"] at 22% opacity
const GRID = "rgba(255,255,255,0.04)";

const socialHeadline = "Ship your Startup,";
const socialSubheadline = `powered by ${brand.name} Agent OS.`;

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
        backgroundImage: `radial-gradient(ellipse 80% 50% at 50% 42%, ${GLOW_A} 0%, transparent 72%), radial-gradient(ellipse 60% 40% at 72% 70%, ${GLOW_B} 0%, transparent 75%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${GRID} 1px, transparent 1px), linear-gradient(90deg, ${GRID} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }}
      />

      <span
        style={{
          fontSize: 22,
          color: "rgba(255,255,255,0.72)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 22,
        }}
      >
        {brand.name} Sailor
      </span>

      <span
        style={{
          fontSize: 78,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "-0.03em",
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        {socialHeadline}
      </span>
      <span
        style={{
          fontSize: 34,
          color: "#8fdcff",
          textAlign: "center",
          marginTop: 10,
        }}
      >
        {socialSubheadline}
      </span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: 42,
          background: "rgba(2,6,23,0.82)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 14,
          padding: "12px 28px",
        }}
      >
        <span style={{ fontSize: 22, color: "rgba(255,255,255,0.42)", marginRight: 12 }}>$</span>
        <span
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.92)",
            fontFamily: "monospace",
          }}
        >
          npx create-sailor@latest
        </span>
      </div>
    </div>,
    { ...size },
  );
}
