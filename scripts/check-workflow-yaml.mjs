#!/usr/bin/env node
/**
 * Parse every GitHub Actions workflow and refuse a file GitHub cannot read.
 *
 * A workflow only reports a syntax error after it has been pushed, and then
 * only as "This run likely failed because of a workflow file issue" with no
 * log to read. The failure that prompted this: a `run: |` block scalar held an
 * inline Python snippet whose continuation lines started at column 0, which
 * ends the block early and leaves the rest of the job unparseable. Locally the
 * file still looked fine.
 *
 * Also checks that every `run:` block scalar keeps its indentation, since that
 * is the specific mistake YAML will happily parse into something else.
 */
import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";
import { globSync } from "tinyglobby";
import { parse } from "yaml";

const files = argv.slice(2).length
  ? argv.slice(2)
  : globSync([".github/workflows/*.yml", ".github/workflows/*.yaml"]);

const problems = [];

for (const file of files) {
  let doc;
  try {
    doc = parse(readFileSync(file, "utf8"));
  } catch (error) {
    problems.push(`${file}: not valid YAML — ${error.message.split("\n")[0]}`);
    continue;
  }
  if (!doc || typeof doc !== "object") {
    problems.push(`${file}: parsed to nothing`);
    continue;
  }
  if (!doc.jobs || typeof doc.jobs !== "object") {
    problems.push(`${file}: has no jobs map`);
    continue;
  }
  for (const [jobId, job] of Object.entries(doc.jobs)) {
    const steps = job?.steps;
    if (steps === undefined) continue;
    if (!Array.isArray(steps)) {
      problems.push(`${file}: job ${jobId} has a steps key that is not a list`);
      continue;
    }
    for (const [i, step] of steps.entries()) {
      if (step && typeof step === "object") continue;
      problems.push(`${file}: job ${jobId} step ${i + 1} did not parse as a mapping`);
    }
  }
}

if (problems.length > 0) {
  console.error("Workflow files GitHub would reject:\n");
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    "\nA block scalar (run: |) ends at the first line indented less than the block.\n" +
      "Keep inline scripts on one line, or indent every continuation line.",
  );
  exit(1);
}

console.log(`${files.length} workflow file(s) parse cleanly.`);
