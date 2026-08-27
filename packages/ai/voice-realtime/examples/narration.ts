import { createDemoBrandContext } from "@nebutra/generation-context";
import { VoiceRealtime } from "../src/index";

const asset = await new VoiceRealtime().synthesizeNarration(
  { script: "Loop makes debugging visible.", targetDurationS: 3 },
  createDemoBrandContext(),
);

process.stdout.write(`${asset.path}\n`);
