import { readCapabilityDebug } from "@nebutra/capability-kit/debug";

const entries = await readCapabilityDebug("provider-registry", { limit: 5 });

process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
