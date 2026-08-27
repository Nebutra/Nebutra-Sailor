import { LandingBuilder, readLandingBuilderDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const root = process.env.LANDING_BUILDER_ROOT ?? ".nebutra/landing-builder";
const tenantId = process.env.NEBUTRA_TENANT_ID ?? "local";

const brand = {
  tenantId,
  brandId: "loop",
  name: "Loop",
  palette: [
    { name: "electric cyan", hex: "#00D4FF", role: "primary" },
    { name: "carbon black", hex: "#111318", role: "background" },
    { name: "signal amber", hex: "#F3C14B", role: "accent" },
  ],
  typography: { heading: "Geist Mono", body: "Geist Sans", accent: "Geist Mono" },
  visualStyle: { name: "cyberpunk", keywords: ["electric", "terminal-native"], avoid: [] },
  referenceImages: [],
  forbidden: [],
  toneKeywords: ["technical", "direct", "warm"],
  sourcePath: "company/BRAND.md",
} as const;

if (command === "doctor") {
  const builder = await LandingBuilder.open(root, { tenantId });
  try {
    process.stdout.write(`${JSON.stringify(await builder.doctor(), null, 2)}\n`);
  } finally {
    await builder.close();
  }
} else if (command === "quickstart") {
  const builder = await LandingBuilder.open(root, { tenantId });
  try {
    process.stdout.write(
      `${JSON.stringify(
        await builder.runOnePager({
          brand,
          productDesc: process.argv.slice(3).join(" ") || "AI debugging for indie devs",
          ctaText: "Join the waitlist",
        }),
        null,
        2,
      )}\n`,
    );
  } finally {
    await builder.close();
  }
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "landing-builder", entries: await readLandingBuilderDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown landing-builder command: ${command}\n`);
  process.exitCode = 1;
}
