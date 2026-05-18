import { BrandGenesis } from "../src";

const genesis = await BrandGenesis.open(".nebutra/brand-genesis-example", {
  tenantId: "tenant_demo",
});

try {
  const result = await genesis.run({
    idea: "AI debugging for indie devs called Loop",
    visualDirectionHint: "cyberpunk",
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        brand: result.brand.name,
        brandMd: result.brandMdPath,
        film: result.film.path,
        eventId: result.eventId,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await genesis.close();
}
