/* eslint-env node */
/* global process, console */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as Python from "fumadocs-python";
import { rimraf } from "rimraf";

// Note: You must first extract python documentation using `fumapy-generate <package-name>`
// Output JSON file path
const jsonPath = path.resolve(process.cwd(), "./docs-python.json");

async function generate() {
  const out = path.resolve(process.cwd(), "content/docs/zh/(api)"); // Output to docs framework

  // Try to read the JSON file, if it doesn't exist, we exit gracefully
  try {
    await fs.access(jsonPath);
  } catch {
    return;
  }

  // clean previous output
  await rimraf(out);

  const content = JSON.parse((await fs.readFile(jsonPath)).toString());

  const converted = Python.convert(content, {
    baseUrl: "/docs/zh/(api)", // Align with Fumadocs locale baseline
  });

  await Python.write(converted, {
    outDir: out,
  });
}

void generate();
