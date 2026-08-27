import { createDemoBrandContext } from "@nebutra/generation-context";
import { AudioPipeline, readAudioDebug } from "./index";

const command = process.argv[2] ?? "doctor";
const pipeline = new AudioPipeline();

if (command === "doctor") {
  process.stdout.write(
    `${JSON.stringify({ capability: "audio-pipeline", results: await pipeline.doctor() }, null, 2)}\n`,
  );
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "audio-pipeline", entries: await readAudioDebug() }, null, 2)}\n`,
  );
} else if (command === "license") {
  const asset = await pipeline.generate(
    { type: "bgm", durationS: 3, mood: "uplifting technical" },
    createDemoBrandContext(),
    true,
  );
  process.stdout.write(
    `${JSON.stringify({ capability: "audio-pipeline", license: await pipeline.license(asset) }, null, 2)}\n`,
  );
} else if (command === "loudness") {
  const asset = await pipeline.generate(
    { type: "sfx", description: "keyboard typing", durationS: 1 },
    createDemoBrandContext(),
    true,
  );
  process.stdout.write(
    `${JSON.stringify({ capability: "audio-pipeline", loudness: await pipeline.loudness(asset) }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown audio-pipeline command: ${command}\n`);
  process.exitCode = 1;
}
