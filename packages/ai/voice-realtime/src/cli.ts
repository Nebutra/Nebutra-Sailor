import { createDemoBrandContext } from "@nebutra/generation-context";
import { readVoiceDebug, VoiceRealtime } from "./index";

const command = process.argv[2] ?? "doctor";
const voice = new VoiceRealtime();

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "voice-realtime", results: await voice.doctor() }, null, 2)}\n`,
  );
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "voice-realtime", entries: await readVoiceDebug() }, null, 2)}\n`,
  );
} else if (command === "enroll") {
  process.stdout.write(
    `${JSON.stringify({ capability: "voice-realtime", profile: await voice.enroll({ tenantId: "local" }) }, null, 2)}\n`,
  );
} else if (command === "test-mic") {
  process.stdout.write(
    `${JSON.stringify({ capability: "voice-realtime", mic: await voice.testMic() }, null, 2)}\n`,
  );
} else if (command === "narrate") {
  const asset = await voice.synthesizeNarration(
    { script: "Loop helps indie developers debug the work that matters.", targetDurationS: 3 },
    createDemoBrandContext(),
  );
  process.stdout.write(`${JSON.stringify({ capability: "voice-realtime", asset }, null, 2)}\n`);
} else {
  process.stderr.write(`Unknown voice-realtime command: ${command}\n`);
  process.exitCode = 1;
}
