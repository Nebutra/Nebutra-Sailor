import { FounderCemetery } from "../src/index";

const cemetery = await FounderCemetery.open(".nebutra/founder-cemetery-example", {
  tenantId: "local",
});

try {
  process.stdout.write(`${JSON.stringify(await cemetery.doctor(), null, 2)}\n`);
} finally {
  await cemetery.close();
}
