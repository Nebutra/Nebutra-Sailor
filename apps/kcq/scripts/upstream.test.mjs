import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { updatePin, validatePin, validateRef } from "./upstream.mjs";

const pin = {
  repository: "https://github.com/TsekaLuk/KLineChartQuant.git",
  commit: "a".repeat(40),
};
test("accepts only immutable revisions and credential-free GitHub repositories", () => {
  assert.deepEqual(validatePin(pin), pin);
  for (const repository of [
    "https://user:secret@github.com/a/b.git",
    "file:///repo",
    "https://github.com/a/b.git?token=x",
    "https://evil.example/a/b.git",
  ]) {
    assert.throws(() => validatePin({ ...pin, repository }));
  }
  assert.throws(() => validatePin({ ...pin, commit: "main" }));
  for (const ref of ["--upload-pack=evil", "main\nother", "../main", "main:other"]) {
    assert.throws(() => validateRef(ref));
  }
  assert.equal(validateRef("release/v1.2.3"), "release/v1.2.3");
});
test("candidate validation failure and dry run preserve the production pin", async () => {
  const directory = mkdtempSync(join(tmpdir(), "kcq-pin-test-"));
  const path = join(directory, "chart-source.json");
  const original = `${JSON.stringify(pin)}\n`;
  writeFileSync(path, original);
  const candidate = { ...pin, commit: "b".repeat(40) };
  try {
    await assert.rejects(
      updatePin(
        path,
        candidate,
        async () => {
          throw new Error("missing contract");
        },
        true,
      ),
    );
    assert.equal(readFileSync(path, "utf8"), original);
    await updatePin(path, candidate, async () => {}, false);
    assert.equal(readFileSync(path, "utf8"), original);
    await updatePin(path, candidate, async () => {}, true);
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), candidate);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test("does not overwrite a pin changed while candidate validation was running", async () => {
  const directory = mkdtempSync(join(tmpdir(), "kcq-pin-race-"));
  const path = join(directory, "chart-source.json");
  writeFileSync(path, JSON.stringify(pin));
  try {
    await assert.rejects(
      updatePin(
        path,
        { ...pin, commit: "b".repeat(40) },
        async () => {
          writeFileSync(path, "concurrent edit");
        },
        true,
      ),
      /changed/,
    );
    assert.equal(readFileSync(path, "utf8"), "concurrent edit");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
