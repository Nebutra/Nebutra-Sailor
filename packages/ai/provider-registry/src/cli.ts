import { ProviderRegistry, readDebug } from "./index";

const command = process.argv[2] ?? "doctor";

if (command === "doctor") {
  const results = await ProviderRegistry.default().doctor();
  process.stdout.write(
    `${JSON.stringify({ capability: "provider-registry", results }, null, 2)}\n`,
  );
} else if (command === "debug") {
  const id = process.argv[3];
  const entries = await readDebug("provider-registry", id ? 50 : 10);
  process.stdout.write(
    `${JSON.stringify({ capability: "provider-registry", id, entries }, null, 2)}\n`,
  );
} else {
  process.stderr.write(`Unknown provider-registry command: ${command}\n`);
  process.exitCode = 1;
}
