import { ProviderRegistry } from "../src/index";

const provider = ProviderRegistry.default().get("local");
const response = await provider.complete(
  [{ role: "user", content: "Say hello in one short sentence." }],
  {
    maxTokens: 32,
  },
);

process.stdout.write(`${response.text}\n`);
