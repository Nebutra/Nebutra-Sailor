import { readSkillDebug, ToolRegistry } from "./index";

const command = process.argv[2] ?? "list";
const root = process.env.TOOL_REGISTRY_ROOT ?? ".nebutra/skills";
const registry = await ToolRegistry.open(root);

try {
  if (command === "doctor") {
    process.stdout.write(
      `${JSON.stringify({ capability: "tool-registry", ...(await registry.doctor()) }, null, 2)}\n`,
    );
  } else if (command === "list") {
    process.stdout.write(
      `${JSON.stringify({ capability: "tool-registry", skills: await registry.list() }, null, 2)}\n`,
    );
  } else if (command === "new") {
    const name = process.argv[3];
    if (!name) throw new Error("Missing skill name");
    process.stdout.write(
      `${JSON.stringify({ capability: "tool-registry", skill: await registry.newSkill(name) }, null, 2)}\n`,
    );
  } else if (command === "test") {
    const name = process.argv[3];
    if (!name) throw new Error("Missing skill name");
    process.stdout.write(
      `${JSON.stringify({ capability: "tool-registry", report: await registry.test(name) }, null, 2)}\n`,
    );
  } else if (command === "debug") {
    process.stdout.write(
      `${JSON.stringify({ capability: "tool-registry", entries: await readSkillDebug() }, null, 2)}\n`,
    );
  } else {
    process.stderr.write(`Unknown tool-registry command: ${command}\n`);
    process.exitCode = 1;
  }
} finally {
  await registry.close();
}
