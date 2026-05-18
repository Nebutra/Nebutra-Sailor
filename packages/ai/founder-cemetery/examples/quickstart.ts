import { FounderCemetery } from "../src/index";

const cemetery = await FounderCemetery.open(".nebutra/founder-cemetery-example", {
  tenantId: "local",
});

try {
  const flow = await cemetery.startClosingFlow({
    companyId: "loop",
    companyName: "Loop",
    founderIds: ["alice"],
  });
  process.stdout.write(`${JSON.stringify(flow, null, 2)}\n`);
} finally {
  await cemetery.close();
}
