import { CodeExecutor } from "@nebutra/code-execution";

const exec = new CodeExecutor({ tenantId: "local", workspaceRoot: process.cwd() });
const observation = await exec.run({
  type: "edit",
  tenantId: "local",
  path: "scratch/example.txt",
  diff: [
    "--- a/scratch/example.txt",
    "+++ b/scratch/example.txt",
    "@@ -1 +1 @@",
    "-old",
    "+new",
    "",
  ].join("\n"),
});
process.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
