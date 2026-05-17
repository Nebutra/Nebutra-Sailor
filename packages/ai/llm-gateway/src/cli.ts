import { readDebug } from "@nebutra/provider-registry";
import { LlmGateway } from "./index";

const command = process.argv[2] ?? "doctor";

if (command === "doctor") {
  const gateway = LlmGateway.default();
  process.stdout.write(
    `${JSON.stringify(
      {
        capability: "llm-gateway",
        cache: gateway.cacheStats(),
        usage: gateway.usageReport(),
        fallbackPath: gateway.route({ capability: "reasoning", messages: [] }).map((p) => p.id),
      },
      null,
      2,
    )}\n`,
  );
} else if (command === "debug") {
  const id = process.argv[3];
  const entries = await readDebug("llm-gateway", id ? 50 : 10);
  process.stdout.write(`${JSON.stringify({ capability: "llm-gateway", id, entries }, null, 2)}\n`);
} else {
  process.stderr.write(`Unknown llm-gateway command: ${command}\n`);
  process.exitCode = 1;
}
