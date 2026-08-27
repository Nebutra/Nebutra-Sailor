import { createDemoBrandContext } from "@nebutra/generation-context";
import { ImagePipeline, readImageDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const pipeline = new ImagePipeline();

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "image-pipeline", results: await pipeline.doctor() }, null, 2)}\n`,
  );
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "image-pipeline", entries: await readImageDebug() }, null, 2)}\n`,
  );
} else if (command === "warmup") {
  process.stdout.write(
    `${JSON.stringify({ capability: "image-pipeline", result: await pipeline.warmup() }, null, 2)}\n`,
  );
} else if (command === "workflows") {
  process.stdout.write(
    `${JSON.stringify({ capability: "image-pipeline", workflows: await pipeline.workflows() }, null, 2)}\n`,
  );
} else if (command === "quickstart") {
  const asset = await pipeline.generate(
    { type: "logo", company: "Loop", oneLiner: "AI debugging for indie devs" },
    createDemoBrandContext(),
  );
  process.stdout.write(`${JSON.stringify({ capability: "image-pipeline", asset }, null, 2)}\n`);
} else {
  process.stderr.write(`Unknown image-pipeline command: ${command}\n`);
  process.exitCode = 1;
}
