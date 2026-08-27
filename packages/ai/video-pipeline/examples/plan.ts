import { createDemoBrandContext } from "@nebutra/generation-context";
import { VideoPipeline } from "../src/index";

const storyboard = await new VideoPipeline().plan(
  { type: "brand-film", durationS: 24, theme: "indie developer journey" },
  createDemoBrandContext(),
);

process.stdout.write(`${JSON.stringify(storyboard.scenes, null, 2)}\n`);
