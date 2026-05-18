import { LandingBuilder } from "../src/index";

const builder = await LandingBuilder.open(".nebutra/landing-builder-example", {
  tenantId: "local",
});

try {
  const result = await builder.runOnePager({
    brand: {
      tenantId: "local",
      brandId: "loop",
      name: "Loop",
      palette: [
        { name: "electric cyan", hex: "#00D4FF", role: "primary" },
        { name: "carbon black", hex: "#111318", role: "background" },
      ],
      typography: { heading: "Geist Mono", body: "Geist Sans", accent: "Geist Mono" },
      visualStyle: { name: "cyberpunk", keywords: ["electric"], avoid: [] },
      referenceImages: [],
      forbidden: [],
      toneKeywords: ["technical"],
      sourcePath: "company/BRAND.md",
    },
    productDesc: "AI debugging for indie devs",
    ctaText: "Join the waitlist",
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await builder.close();
}
