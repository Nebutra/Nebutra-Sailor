import { brand, colors } from "@nebutra/brand/metadata";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Satori does NOT resolve CSS var() — use explicit brand gradient from metadata.
// colors.gradient.primary includes OKLab mid stop (#00A2E9) for clean blue→cyan path.
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
        background: colors.gradient.primary,
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
