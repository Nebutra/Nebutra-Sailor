import { readToolDebug } from "../src/index";

const entries = await readToolDebug(5);

process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
