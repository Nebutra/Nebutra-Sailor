import { CodeExecutor } from "@nebutra/code-execution";

const exec = new CodeExecutor({ tenantId: "local" });
const observation = await exec.run({
  type: "shell",
  tenantId: "local",
  cwd: process.cwd(),
  cmd: "echo sandbox ok",
  timeoutS: 5,
});
process.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
