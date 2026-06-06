import { brand, colors } from "@nebutra/brand/metadata";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Satori does NOT resolve CSS var() — use explicit hex from brand metadata.
const PRIMARY = colors.primary["500"]; // "#0033FE"
const ACCENT = colors.accent["500"]; // "#0BF1C3"
// First letter of brand name used as logomark text fallback.
const INITIAL = brand.name.charAt(0).toUpperCase();

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
        borderRadius: 40,
      }}
    >
      <span
        style={{
          fontSize: 100,
          fontWeight: 700,
          color: "white",
        }}
      >
        {INITIAL}
      </span>
    </div>,
    { ...size },
  );
}
