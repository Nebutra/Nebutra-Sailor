import { DocumentPipeline } from "@nebutra/document-pipeline";

const pipeline = await DocumentPipeline.open(".nebutra/document-pipeline-example", {
  tenantId: "local",
});

try {
  await pipeline.parse({
    tenantId: "local",
    source: { type: "file", path: "paper.pdf" },
  });
} catch (error) {
  process.stdout.write(`${JSON.stringify(error, null, 2)}\n`);
}
