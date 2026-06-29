import { colors } from "@nebutra/brand/metadata";
import { buildPwaManifest } from "@nebutra/brand/metadata-helpers";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    ...buildPwaManifest(),
    theme_color: colors.primary["500"],
  };
}
