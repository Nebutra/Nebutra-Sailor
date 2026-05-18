import { createDemoBrandContext } from "@nebutra/generation-context";
import { MeshPipeline, readMeshDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const pipeline = new MeshPipeline();

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "3d-pipeline", results: await pipeline.doctor() }, null, 2)}\n`,
  );
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "3d-pipeline", entries: await readMeshDebug() }, null, 2)}\n`,
  );
} else if (command === "preview") {
  const asset = await pipeline.fromText("sleek debugging mascot", createDemoBrandContext());
  process.stdout.write(
    `${JSON.stringify({ capability: "3d-pipeline", preview: await pipeline.preview(asset) }, null, 2)}\n`,
  );
} else if (command === "export") {
  const asset = await pipeline.fromText("sleek debugging mascot", createDemoBrandContext());
  process.stdout.write(
    `${JSON.stringify({ capability: "3d-pipeline", export: await pipeline.export(asset, "gltf") }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown 3d-pipeline command: ${command}\n`);
  process.exitCode = 1;
}
