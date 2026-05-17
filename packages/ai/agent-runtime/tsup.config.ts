import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    model: "src/model.ts",
    protocol: "src/protocol.ts",
    policy: "src/policy.ts",
    tools: "src/tools.ts",
    rollout: "src/rollout.ts",
    sandbox: "src/sandbox.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
