import { LandingBuilder } from "../src/index";

const builder = await LandingBuilder.open(".nebutra/landing-builder-example", {
  tenantId: "local",
});

try {
  process.stdout.write(`${JSON.stringify(await builder.doctor(), null, 2)}\n`);
} finally {
  await builder.close();
}
