import { brand, colors } from "@nebutra/brand/metadata";
import { ImageResponse } from "next/og";

// The home-screen icon: the brand's initial on a rounded square in the brand
// colour — the same mark brand:apply draws for the favicon set.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
        background: colors.primary["500"],
        borderRadius: 40,
      }}
    >
      <span style={{ fontSize: 112, fontWeight: 600, color: "white" }}>{INITIAL}</span>
    </div>,
    { ...size },
  );
}
