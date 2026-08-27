import { createDemoBrandContext } from "@nebutra/generation-context";
import { VideoPipeline } from "../src/index";

const pipeline = new VideoPipeline();
const storyboard = await pipeline.plan(
  { type: "turntable", durationS: 8, subject: "product mockup" },
  createDemoBrandContext(),
);

process.stdout.write(`${JSON.stringify(await pipeline.preview(storyboard), null, 2)}\n`);
