import { FounderCemetery } from "../src/index";

const cemetery = await FounderCemetery.open(".nebutra/founder-cemetery-memorial-example", {
  tenantId: "local",
});

try {
  const analysis = await cemetery.analyzeDeath({
    companyId: "loop",
    companyName: "Loop",
    timelineSummaries: ["Pivoted twice before validating customer demand", "Outbound stayed flat"],
  });
  const lessons = await cemetery.extractLessons(analysis);
  process.stdout.write(
    `${JSON.stringify(await cemetery.publishMemorial({ analysis, lessons, publishLevel: "community", consentSignatures: ["alice"] }), null, 2)}\n`,
  );
} finally {
  await cemetery.close();
}
