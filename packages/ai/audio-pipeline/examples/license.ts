import { createDemoBrandContext } from "@nebutra/generation-context";
import { AudioPipeline } from "../src/index";

const pipeline = new AudioPipeline();
const asset = await pipeline.generate(
  { type: "sfx", description: "keyboard typing", durationS: 2 },
  createDemoBrandContext(),
  true,
);

process.stdout.write(`${JSON.stringify(await pipeline.license(asset), null, 2)}\n`);
