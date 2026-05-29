import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(new URL("./publish-blog-post.mjs", import.meta.url));

test("dry-run import keeps mermaid fences and display math as structured blocks", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nebutra-blog-publish-"));
  const file = path.join(dir, "post.md");

  await writeFile(
    file,
    [
      "# Structured post",
      "",
      "Inline text before math.",
      "",
      "$$",
      "E = mc^2",
      "$$",
      "",
      "```mermaid",
      "flowchart LR",
      '  A["Idea"] --> B["Company"]',
      "```",
      "",
    ].join("\n"),
    "utf8",
  );

  try {
    const { stdout } = await execFileAsync(process.execPath, [
      scriptPath,
      "--file",
      file,
      "--language",
      "en",
      "--slug",
      "structured-post",
      "--translation-key",
      "structured-post",
      "--dry-run",
    ]);

    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.deepEqual(result.summary.blockTypes, ["block", "mathBlock", "mermaid"]);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});
