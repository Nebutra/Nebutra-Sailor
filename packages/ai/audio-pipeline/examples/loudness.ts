import { createDemoBrandContext } from "@nebutra/generation-context";
import { AudioPipeline } from "../src/index";

const pipeline = new AudioPipeline();
const asset = await pipeline.generate(
  { type: "song", lyricsPrompt: "indie developer anthem", durationS: 8 },
  createDemoBrandContext(),
  true,
);

process.stdout.write(`${JSON.stringify(await pipeline.loudness(asset), null, 2)}\n`);
