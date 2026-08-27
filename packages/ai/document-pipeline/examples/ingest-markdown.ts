import { DocumentPipeline } from "@nebutra/document-pipeline";

const pipeline = await DocumentPipeline.open(".nebutra/document-pipeline-example", {
  tenantId: "local",
});

const result = await pipeline.ingest({
  tenantId: "local",
  source: {
    type: "inline",
    path: "research/note.md",
    content: "---\nschema: research_note\n---\nretrieval augmented generation notes",
  },
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
