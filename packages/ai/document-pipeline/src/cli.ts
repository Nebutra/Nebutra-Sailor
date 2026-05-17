import { DocumentPipeline, readDocumentPipelineDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const pipeline = await DocumentPipeline.open(
  process.env.DOCUMENT_PIPELINE_ROOT ?? ".nebutra/document-pipeline",
  {
    tenantId: process.env.NEBUTRA_TENANT_ID ?? "local",
  },
);

if (command === "doctor") {
  process.stdout.write(`${JSON.stringify(await pipeline.doctor(), null, 2)}\n`);
} else if (command === "ingest") {
  const path = process.argv[3];
  if (!path) {
    process.stderr.write("Usage: pnpm docs:ingest <path>\n");
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `${JSON.stringify({ capability: "document-pipeline", result: await pipeline.ingestFile(path) }, null, 2)}\n`,
    );
  }
} else if (command === "inspect" || command === "debug") {
  const entries = await readDocumentPipelineDebug();
  process.stdout.write(
    `${JSON.stringify({ capability: "document-pipeline", entries }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown document-pipeline command: ${command}\n`);
  process.exitCode = 1;
}
