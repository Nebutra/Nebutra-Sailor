import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    commands: "src/commands.ts",
    definitions: "src/definitions.ts",
    dispatcher: "src/dispatcher.ts",
    "durable-turn": "src/durable-turn.ts",
    "hook-pipeline": "src/hook-pipeline.ts",
    loop: "src/loop.ts",
    "mcp-bridge": "src/mcp-bridge.ts",
    model: "src/model.ts",
    policy: "src/policy.ts",
    protocol: "src/protocol.ts",
    rollout: "src/rollout.ts",
    "rollout-store-persistent": "src/rollout-store-persistent.ts",
    sandbox: "src/sandbox.ts",
    skills: "src/skills.ts",
    subagents: "src/subagents.ts",
    tools: "src/tools.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
