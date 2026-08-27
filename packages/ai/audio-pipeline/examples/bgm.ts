import { createDemoBrandContext } from "@nebutra/generation-context";
import { AudioPipeline } from "../src/index";

const asset = await new AudioPipeline().generate(
  { type: "bgm", durationS: 5, mood: "uplifting tech", bpm: 110 },
  createDemoBrandContext(),
  true,
);

process.stdout.write(`${asset.path}\n`);
