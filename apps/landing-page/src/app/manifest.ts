import { buildPwaManifest } from "@nebutra/brand/metadata-helpers";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    ...buildPwaManifest(),
    theme_color: "#0033FE",
  };
}
