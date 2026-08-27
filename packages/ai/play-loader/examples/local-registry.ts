import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PlayLoader } from "../src";

const root = await mkdtemp(join(tmpdir(), "play-loader-"));
try {
  const loader = await PlayLoader.open(root);
  await loader.newPlay("demo_play");
  process.stdout.write(`${JSON.stringify(await loader.list())}\n`);
  process.stdout.write(`${JSON.stringify(await loader.test("demo_play"))}\n`);
} finally {
  await rm(root, { recursive: true, force: true });
}
