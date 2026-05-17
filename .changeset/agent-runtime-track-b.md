---
"@nebutra/agent-runtime": minor
---

Concrete Track-B coupling for the agent-runtime external-sandbox seam.

- Add `createHttpSandbox(baseUrl)`: an `ExternalSandbox` that delegates
  execution over HTTP to the decoupled Rust isolator
  (`backends/rust/sandbox`, `POST /api/v1/sandbox/exec`).
- Non-2xx isolator responses (e.g. a fail-closed 403 refusal) surface as
  `SandboxDelegationError` and are never coerced into a fabricated result.
- The Rust isolator now mirrors the `SandboxExecRequest` /
  `SandboxExecResult` / `CapabilityPolicy` wire shapes and is fail-closed
  until a real isolation backend (Wasmtime/Firecracker) is wired.
