import { DocumentPipeline } from "@nebutra/document-pipeline";

const pipeline = await DocumentPipeline.open(".nebutra/document-pipeline-example", {
  tenantId: "local",
});

const result = await pipeline.parse({
  tenantId: "local",
  source: {
    type: "inline",
    path: "landing.html",
    content: "<h1>Launch</h1><p>Clear operator language</p>",
  },
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
