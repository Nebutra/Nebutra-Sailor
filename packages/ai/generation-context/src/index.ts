import { CapabilityError } from "@nebutra/errors";

export interface PathRef {
  readonly path: string;
  readonly tenantId?: string;
  readonly mediaType?: string;
}

export interface BrandColor {
  readonly name: string;
  readonly hex: string;
  readonly role?: "primary" | "secondary" | "accent" | "neutral" | "background";
}

export interface TypographySpec {
  readonly heading: string;
  readonly body: string;
  readonly accent?: string;
}

export interface VisualStyle {
  readonly name: string;
  readonly keywords: readonly string[];
  readonly avoid?: readonly string[];
}

export interface BrandContext {
  readonly tenantId: string;
  readonly brandId: string;
  readonly name: string;
  readonly palette: readonly BrandColor[];
  readonly typography: TypographySpec;
  readonly visualStyle: VisualStyle;
  readonly referenceImages: readonly PathRef[];
  readonly forbidden: readonly string[];
  readonly toneKeywords: readonly string[];
  readonly sourcePath: string;
}

export type LicenseStatus = "commercial-ok" | "non-commercial" | "requires-attribution" | "unknown";

export interface LicenseMetadata {
  readonly status: LicenseStatus;
  readonly source: string;
  readonly suggestion?: string;
}

export interface GeneratedAsset {
  readonly id: string;
  readonly tenantId: string;
  readonly kind: "image" | "video" | "audio" | "voice" | "mesh";
  readonly path: string;
  readonly brandId: string;
  readonly provider: string;
  readonly model: string;
  readonly createdAt: string;
  readonly license: LicenseMetadata;
  readonly metadata?: Record<string, unknown>;
}

export function requireBrandContext(
  brand: BrandContext | undefined,
  capability: string,
): BrandContext {
  if (!brand) {
    throw new CapabilityError(capability, "BrandContext is required for generation", {
      suggestion:
        "Load company/BRAND.md through content-store and pass the parsed BrandContext into this call.",
      statusCode: 400,
    });
  }

  const missing: string[] = [];
  if (!brand.tenantId) missing.push("tenantId");
  if (!brand.brandId) missing.push("brandId");
  if (!brand.name) missing.push("name");
  if (brand.palette.length === 0) missing.push("palette");
  if (!brand.typography.heading || !brand.typography.body) missing.push("typography");
  if (!brand.visualStyle.name || brand.visualStyle.keywords.length === 0) {
    missing.push("visualStyle");
  }
  if (brand.toneKeywords.length === 0) missing.push("toneKeywords");
  if (!brand.sourcePath) missing.push("sourcePath");

  if (missing.length > 0) {
    throw new CapabilityError(capability, "BrandContext is incomplete", {
      suggestion: `Fill these BrandContext fields before generation: ${missing.join(", ")}.`,
      metadata: { missing },
      statusCode: 400,
    });
  }

  return brand;
}

export function summarizeBrandContext(brand: BrandContext): string {
  return [
    brand.name,
    `style=${brand.visualStyle.name}`,
    `tone=${brand.toneKeywords.join(", ")}`,
    `palette=${brand.palette.map((color) => `${color.name}:${color.hex}`).join(", ")}`,
  ].join("; ");
}

export function createDemoBrandContext(overrides: Partial<BrandContext> = {}): BrandContext {
  return {
    tenantId: "demo_tenant",
    brandId: "loop",
    name: "Loop",
    palette: [
      { name: "signal", hex: "#00A693", role: "primary" },
      { name: "ink", hex: "#151719", role: "neutral" },
      { name: "spark", hex: "#F3C14B", role: "accent" },
    ],
    typography: { heading: "Geist Sans", body: "Geist Sans Mono" },
    visualStyle: {
      name: "focused technical optimism",
      keywords: ["precise", "calm", "developer-native"],
      avoid: ["dark horror", "generic stock"],
    },
    referenceImages: [],
    forbidden: ["dark horror", "skeletal imagery"],
    toneKeywords: ["technical", "warm", "direct"],
    sourcePath: "company/BRAND.md",
    ...overrides,
  };
}

export function assetId(prefix: string, seed: string): string {
  return `${prefix}_${seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)}_${Date.now().toString(36)}`;
}
