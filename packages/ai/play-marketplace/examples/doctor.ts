import { PlayMarketplace } from "../src/index";

const marketplace = await PlayMarketplace.open(".nebutra/play-marketplace-example", {
  tenantId: "local",
});

try {
  process.stdout.write(`${JSON.stringify(await marketplace.doctor(), null, 2)}\n`);
} finally {
  await marketplace.close();
}
