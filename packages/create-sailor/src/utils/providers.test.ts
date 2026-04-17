/**
 * Smoke test for the provider template renderer. Runs as a plain node
 * script (no test framework) so it works in any CI context.
 *
 * Usage: tsx packages/create-sailor/src/utils/providers.test.ts
 */
import { type ProviderSelection, renderTemplate } from "./providers.js";

const sampleTemplate = `
// @sailor:provider:openai
import { openai } from '@ai-sdk/openai';
// @sailor:provider:anthropic
import { anthropic } from '@ai-sdk/anthropic';
// @sailor:cn-compatible
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// @sailor:cn-instance:siliconflow
const siliconflow = createOpenAICompatible({ name: 'siliconflow' });
`;

const selection: ProviderSelection = { providerIds: ["openai"] };
const result = renderTemplate(sampleTemplate, selection);

const assertions: Array<[string, boolean]> = [
  ["contains openai import", result.includes("@ai-sdk/openai")],
  ["drops anthropic", !result.includes("anthropic")],
  ["drops cn-compatible import", !result.includes("openai-compatible")],
  ["drops siliconflow instance", !result.includes("siliconflow")],
  ["strips @sailor markers", !result.includes("@sailor:")],
];

let failed = 0;
for (const [label, ok] of assertions) {
  process.stdout.write(`${ok ? "PASS" : "FAIL"}  ${label}\n`);
  if (!ok) failed++;
}

if (failed > 0) {
  process.stdout.write(`\n--- rendered output ---\n${result}\n`);
  process.exit(1);
}
process.stdout.write(`\nAll ${assertions.length} assertions passed.\n`);
