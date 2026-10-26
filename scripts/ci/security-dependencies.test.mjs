import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const lock = parse(readFileSync(join(root, "pnpm-lock.yaml"), "utf8"));
const floors = {
  zod: { 4: "4.6.6" },
  "body-parser": { 1: "1.20.9", 2: "2.4.0" },
  undici: { 6: "6.29.1", 7: "7.30.1", 8: "8.12.2" },
};

function versions(name, entries = lock.packages) {
  return [...new Set(Object.keys(entries).filter((key) => key.startsWith(`${name}@`)))].map(
    (key) => key.slice(name.length + 1).split("(")[0],
  );
}

for (const [name, minimums] of Object.entries(floors)) {
  test(`${name} has no vulnerable locked packages or snapshots`, () => {
    for (const entries of [lock.packages, lock.snapshots]) {
      const resolved = versions(name, entries);
      assert.ok(resolved.length > 0, `${name} must be present in the locked graph`);
      for (const version of resolved) {
        assert.match(version, /^\d+\.\d+\.\d+$/, "require a reviewed stable release");
        const minimum = minimums[version.split(".")[0]];
        assert.ok(minimum, `unreviewed ${name} major: ${version}`);
        assert.ok(
          version.localeCompare(minimum, "en", { numeric: true }) >= 0,
          `${name}@${version} is below the security floor ${minimum}`,
        );
      }
    }
  });
}

test("Zod rejects oversized constrained arrays before validating their elements", () => {
  const { z } = require("zod");
  let visited = 0;
  const element = z.preprocess((value) => {
    visited++;
    return value;
  }, z.string());
  const schema = z.array(element).max(2);
  const result = schema.safeParse(Array(1000).fill(42));
  assert.equal(result.success, false);
  assert.equal(visited, 0);
  assert.deepEqual(
    result.error.issues.map((issue) => issue.code),
    ["too_big"],
  );
  assert.deepEqual(schema.parse(["a", "b"]), ["a", "b"]);
  assert.equal(schema.safeParse([42]).success, false);
});

// A vulnerable fetch can crash after its promise rejects. Isolate the real
// installed versions so an unhandled stream error fails only the child process.
for (const version of versions("undici")) {
  test(`undici ${version} survives an excessive-encoding response and early close`, () => {
    const entry = join(root, "node_modules/.pnpm", `undici@${version}`, "node_modules/undici");
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `
          const assert = require("node:assert/strict");
          const net = require("node:net");
          const { once } = require("node:events");
          const { setTimeout: delay } = require("node:timers/promises");
          const { fetch, Agent } = require(process.argv[1]);
          (async () => {
            const server = net.createServer((socket) => {
              socket.once("data", () => socket.end(
                "HTTP/1.1 200 OK\\r\\n" +
                "Content-Encoding: gzip, gzip, gzip, gzip, gzip, gzip\\r\\n" +
                "Content-Length: 100\\r\\nConnection: close\\r\\n\\r\\n"
              ));
            });
            server.listen(0, "127.0.0.1");
            await once(server, "listening");
            const dispatcher = new Agent();
            try {
              await assert.rejects(fetch("http://127.0.0.1:" + server.address().port, {
                dispatcher,
                signal: AbortSignal.timeout(2000),
              }), { name: "TypeError" });
              await delay(100);
              process.stdout.write("survived");
            } finally {
              await dispatcher.destroy();
              server.close();
            }
          })().catch((error) => { console.error(error); process.exitCode = 1; });
        `,
        entry,
      ],
      { cwd: root, encoding: "utf8", timeout: 5000 },
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.equal(result.stdout, "survived");
  });
}
