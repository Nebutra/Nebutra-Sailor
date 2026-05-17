import { readFile } from "node:fs/promises";
import { PlayLoader, parsePlayMarkdown, readPlayDebug, resolvePlayChain } from "./index";

const command = process.argv[2] ?? "list";
const root = process.env.PLAY_LOADER_ROOT ?? ".nebutra";

if (command === "parse") {
  const file = process.argv[3];
  if (!file) throw new Error("Missing play file path");
  const play = parsePlayMarkdown(await readFile(file, "utf8"));
  process.stdout.write(`${JSON.stringify({ capability: "play-loader", play }, null, 2)}\n`);
} else if (command === "chain") {
  const raw = process.argv[3] ?? "[]";
  const nodes = JSON.parse(raw) as Array<{ name: string; dependsOn: string[] }>;
  process.stdout.write(
    `${JSON.stringify({ capability: "play-loader", order: resolvePlayChain(nodes) }, null, 2)}\n`,
  );
} else if (command === "list") {
  const loader = await PlayLoader.open(root);
  process.stdout.write(
    `${JSON.stringify({ capability: "play-loader", plays: await loader.list() }, null, 2)}\n`,
  );
} else if (command === "new") {
  const name = process.argv[3];
  if (!name) throw new Error("Missing play name");
  const loader = await PlayLoader.open(root);
  process.stdout.write(
    `${JSON.stringify({ capability: "play-loader", play: await loader.newPlay(name) }, null, 2)}\n`,
  );
} else if (command === "test") {
  const name = process.argv[3];
  if (!name) throw new Error("Missing play name");
  const loader = await PlayLoader.open(root);
  process.stdout.write(
    `${JSON.stringify({ capability: "play-loader", report: await loader.test(name) }, null, 2)}\n`,
  );
} else if (command === "install") {
  const source = process.argv[3];
  if (!source) throw new Error("Missing play source");
  const loader = await PlayLoader.open(root);
  process.stdout.write(
    `${JSON.stringify({ capability: "play-loader", play: await loader.install(source) }, null, 2)}\n`,
  );
} else if (command === "doctor") {
  const loader = await PlayLoader.open(root);
  process.stdout.write(
    `${JSON.stringify({ capability: "play-loader", ...(await loader.doctor()) }, null, 2)}\n`,
  );
} else if (command === "debug") {
  process.stdout.write(
    `${JSON.stringify({ capability: "play-loader", entries: await readPlayDebug() }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown play-loader command: ${command}\n`);
  process.exitCode = 1;
}
