# browser-control Replication Guide

```ts
import { BrowserControl } from "@nebutra/browser-control";

const browser = BrowserControl.local({ tenantId: "local" });

const result = await browser.task({
  tenantId: "local",
  objective: "Extract visible text and links",
  startUrl: "https://example.com",
  prefer: "deterministic",
});

console.log(result.output);
console.log(await browser.replay(result.sessionId));
```

## Steps

1. Add browser-control to the play runtime as a tool, not as an agent loop.
2. Use `task()` for first-run exploration and recording.
3. Use `replay()` for repeat flows once a recording exists.
4. Store browser profile metadata under the tenant scope.
5. Route authenticated or mutating flows to a configured sidecar.

## Commands

```bash
pnpm browser:doctor
pnpm browser:debug
pnpm browser:replay <session_id>
pnpm browser:profile <tenant>
tsx packages/ai/browser-control/examples/http-extract.ts
```
