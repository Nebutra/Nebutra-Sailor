import { createDemoBrandContext } from "@nebutra/generation-context";
import { readVideoDebug, VideoPipeline } from "./index";

const command = process.argv[2] ?? "doctor";
const pipeline = new VideoPipeline();
const brand = createDemoBrandContext();
const storyboard = await pipeline.plan(
  { type: "brand-film", durationS: 16, theme: "indie developer journey" },
  brand,
);

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "video-pipeline", results: await pipeline.doctor() }, null, 2)}\n`,
  );
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "video-pipeline", entries: await readVideoDebug() }, null, 2)}\n`,
  );
} else if (command === "cost") {
  process.stdout.write(
    `${JSON.stringify({ capability: "video-pipeline", cost: await pipeline.cost(storyboard) }, null, 2)}\n`,
  );
} else if (command === "preview") {
  process.stdout.write(
    `${JSON.stringify({ capability: "video-pipeline", preview: await pipeline.preview(storyboard) }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown video-pipeline command: ${command}\n`);
  process.exitCode = 1;
}
