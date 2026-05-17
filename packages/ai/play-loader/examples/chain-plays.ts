import { resolvePlayChain } from "../src";

process.stdout.write(
  `${JSON.stringify(
    resolvePlayChain([
      { name: "pitch", dependsOn: ["brand", "demo"] },
      { name: "brand", dependsOn: [] },
      { name: "demo", dependsOn: ["brand"] },
    ]),
  )}\n`,
);
