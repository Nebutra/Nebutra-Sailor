import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderProject } from "../src/project/render.ts";
import { formatGenerated } from "./format-generated.mjs";

const packageRoot = resolve(import.meta.dirname, "..");
const { css, ts, warnings } = renderProject(packageRoot);
const cssPath = join(packageRoot, "project.css");
const tsPath = join(packageRoot, "src", "project.generated.ts");
writeFileSync(cssPath, css);
writeFileSync(tsPath, ts);
formatGenerated(cssPath, tsPath);
for (const warning of warnings) process.stderr.write(`emit-project: ${warning}\n`);
process.stdout.write("emit-project: project/ → project.css, src/project.generated.ts\n");
