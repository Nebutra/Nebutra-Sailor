import { createDemoBrandContext } from "@nebutra/generation-context";
import { VideoPipeline } from "../src/index";

const pipeline = new VideoPipeline();
const storyboard = await pipeline.plan(
  { type: "brand-film", durationS: 60, theme: "debugging launch" },
  createDemoBrandContext(),
);

process.stdout.write(`${JSON.stringify(await pipeline.cost(storyboard), null, 2)}\n`);
