import { BrandGenesis } from "../src";

const genesis = await BrandGenesis.open(".nebutra/brand-genesis-doctor", {
  tenantId: "tenant_demo",
});

try {
  process.stdout.write(`${JSON.stringify(await genesis.doctor(), null, 2)}\n`);
} finally {
  await genesis.close();
}
