import { ProviderRegistry } from "../src/index";

const registry = ProviderRegistry.default();
const health = await registry.doctor();

process.stdout.write(`${JSON.stringify(health, null, 2)}\n`);
