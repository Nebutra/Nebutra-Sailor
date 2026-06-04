# @nebutra/sandbox-runtime

Unified sandbox runtime router for local and remote execution providers.

This package defines the domain-neutral sandbox contract used by Nebutra
execution packages. It routes requests to configured providers, exposes provider
health checks, and records debug events for execution troubleshooting.

## Installation

```bash
pnpm add @nebutra/sandbox-runtime
```

## Usage

```ts
import { SandboxRuntime } from "@nebutra/sandbox-runtime";

const runtime = SandboxRuntime.fromConfig();

const result = await runtime.exec({
  cmd: "echo sandbox ok",
  tenantId: "org_123",
  threadId: "thread_123",
  hints: {
    networkAccess: false,
    needsGpu: false,
  },
});
```

## Providers

Default providers:

| Provider | Behavior |
| --- | --- |
| `local_mac` | Calls the local sandbox service at `SANDBOX_RUNTIME_LOCAL_URL` or `http://127.0.0.1:8020/api/v1/sandbox/exec` |
| `remote_code` | Placeholder provider gated by `SANDBOX_REMOTE_CODE_TOKEN` |
| `remote_gpu` | Placeholder provider gated by `SANDBOX_REMOTE_GPU_TOKEN` |
| `remote_workspace` | Placeholder provider gated by `SANDBOX_REMOTE_WORKSPACE_TOKEN` |

Remote placeholders intentionally throw until a provider SDK is configured by
the host application.

## Routing

```ts
const runtime = SandboxRuntime.fromConfig({
  routes: [
    { when: { needsGpu: true }, provider: "remote_gpu" },
    { when: { durationS: 30 }, provider: "remote_code" },
    { when: { needsGpu: false }, provider: "local_mac" },
  ],
});

const plan = runtime.plan({ cmd: "pnpm test", hints: { needsGpu: false } });
```

The first matching static route wins. If no route matches, the runtime falls
back to `local_mac` when it is configured.

## API

| Export | Description |
| --- | --- |
| `SandboxRuntime` | Provider registry, planner, executor, and doctor |
| `createLocalMacSandbox()` | Local sandbox-service adapter |
| `createRemotePlaceholder(id, envKey)` | Explicit placeholder for remote providers |
| `sandboxDebugPath()` | Debug path helper |
| `readSandboxDebug(limit)` | Read sandbox debug events |
| `ExecRequest` / `ExecResponse` | Execution request and response contracts |
| `Sandbox` / `SandboxHealth` | Provider interface and health shape |

## License

MIT
