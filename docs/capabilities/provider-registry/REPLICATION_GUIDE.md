# provider-registry replication guide

```ts
import { ProviderRegistry } from "@nebutra/provider-registry";

const provider = ProviderRegistry.default().get("local");
const response = await provider.complete([
  { role: "user", content: "Say hello in one sentence." },
]);

process.stdout.write(`${response.text}\n`);
```

## Goal

Use Sailor's provider grammar to call a model through a single provider trait. This is the lowest layer: one provider in, one completion out.

## Run it

```bash
pnpm provider:doctor
tsx packages/ai/provider-registry/examples/local-complete.ts
pnpm provider:debug latest
```

## Files to inspect

- `packages/ai/provider-registry/src/index.ts`
- `packages/ai/provider-registry/examples/doctor.ts`
- `.nebutra/debug/provider-registry.jsonl`

## Replication steps

1. Start the local model service with the configured model.
2. Run `pnpm provider:doctor`.
3. Call `ProviderRegistry.default().get("local")`.
4. Send normalized `{ role, content }` messages.
5. Inspect debug output with `pnpm provider:debug latest`.

## Expected result

The quickstart prints a non-empty completion when the local provider is available. If it fails, the thrown `CapabilityError` includes a suggestion.
