import { renderTailwindTheme } from "../src/index";

process.stdout.write(
  `${JSON.stringify(
    renderTailwindTheme({
      tenantId: "local",
      brandId: "loop",
      name: "Loop",
      palette: [{ name: "electric cyan", hex: "#00D4FF", role: "primary" }],
      typography: { heading: "Geist Mono", body: "Geist Sans", accent: "Geist Mono" },
      visualStyle: { name: "minimal", keywords: ["clear"], avoid: [] },
      referenceImages: [],
      forbidden: [],
      toneKeywords: ["direct"],
      sourcePath: "company/BRAND.md",
    }),
    null,
    2,
  )}\n`,
);
