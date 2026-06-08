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

test("dry-run import accepts PortableText JSON without markdown downgrade", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nebutra-blog-publish-json-"));
  const file = path.join(dir, "post.json");

  await writeFile(
    file,
    JSON.stringify(
      {
        title: "Rich post",
        slug: "rich-post",
        translationKey: "rich-post",
        excerpt: "A rich PortableText post.",
        categories: "Nebutra Originals,AI Strategy",
        body: [
          {
            _key: "intro",
            _type: "block",
            style: "normal",
            markDefs: [],
            children: [{ _key: "intro-span", _type: "span", text: "Intro", marks: [] }],
          },
          {
            _key: "callout",
            _type: "calloutBlock",
            tone: "insight",
            title: "Insight",
            body: "This must remain a structured callout.",
          },
          {
            _key: "source",
            _type: "sourceCard",
            title: "Source",
            publisher: "Nebutra",
            url: "https://nebutra.com",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  try {
    const { stdout } = await execFileAsync(process.execPath, [
      scriptPath,
      "--portable-json",
      file,
      "--language",
      "en",
      "--dry-run",
    ]);

    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.deepEqual(result.summary.blockTypes, ["block", "calloutBlock", "sourceCard"]);
    assert.equal(result.summary.slug, "rich-post");
    assert.equal(result.summary.translationKey, "rich-post");
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});
