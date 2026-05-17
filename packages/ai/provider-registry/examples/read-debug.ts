import { readDebug } from "../src/index";

const entries = await readDebug("provider-registry", 5);

process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
