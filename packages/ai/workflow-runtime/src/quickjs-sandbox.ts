/**
 * createQuickJSSandbox — the only sanctioned executor for untrusted tenant
 * workflow JS. Runs scriptSource inside a self-hosted WASM VM
 * (`quickjs-emscripten`), exposing ONLY the host bindings (agent/log/phase) plus
 * a small guest prelude (parallel).
 *
 * MECHANISM: `agent()` does NOT block the VM — it returns a guest Promise the
 * host resolves asynchronously. That is what gives `parallel()` real host-side
 * concurrency despite the single-threaded VM (an asyncify-suspend approach
 * would serialize every call). A pump loop drives the guest job queue while
 * host model calls settle.
 *
 * Caps enforced host-side: VM heap (setMemoryLimit), wall-clock (interrupt
 * handler + pump-loop deadline), agent concurrency (p-limit), and total agent
 * calls (maxAgentsPerRun). The guest can never reach the provider directly.
 */

import pLimit from "p-limit";
import { newAsyncContext, type QuickJSAsyncContext, type QuickJSHandle } from "quickjs-emscripten";
import type { WorkflowSandbox } from "./sandbox";
import type { AgentCallOpts, SandboxResult, SandboxRunInput } from "./types";

/** Marshal a host JSON value into a guest handle (data only — agent results). */
function marshalToGuest(ctx: QuickJSAsyncContext, value: unknown): QuickJSHandle {
  const json = JSON.stringify(value === undefined ? null : value);
  // `(<json>)` is a valid JS expression for any JSON value; JSON.stringify
  // escapes content so untrusted strings cannot break out of the literal.
  return ctx.unwrapResult(ctx.evalCode(`(${json})`));
}

/** Guest prelude: define the orchestration primitives over the host bindings. */
function buildProgram(userScript: string): string {
  return [
    "globalThis.log = (m) => { __host_log(String(m)); };",
    "globalThis.phase = (t) => { __host_phase(String(t)); };",
    "globalThis.agent = (prompt, opts) => __host_agent(String(prompt), opts === undefined ? null : opts);",
    "globalThis.parallel = (thunks) => Promise.all((thunks || []).map((t) => t()));",
    "(async () => {",
    userScript,
    "\n})()",
  ].join("\n");
}

const macrotask = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

export function createQuickJSSandbox(): WorkflowSandbox {
  return {
    async run(input: SandboxRunInput): Promise<SandboxResult> {
      const ctx = await newAsyncContext();
      const deadline = Date.now() + input.limits.timeoutMs;

      try {
        ctx.runtime.setMemoryLimit(input.limits.memoryBytes ?? 64 * 1024 * 1024);
        ctx.runtime.setInterruptHandler(() => Date.now() > deadline);

        const limit = pLimit(input.limits.maxConcurrency);
        let agentCalls = 0;
        const inflight = new Set<Promise<void>>();

        // ── agent(): returns a guest Promise; host model work resolves it ────
        const agentFn = ctx.newFunction("__host_agent", (promptHandle, optsHandle) => {
          const prompt = String(ctx.dump(promptHandle));
          const rawOpts = optsHandle ? ctx.dump(optsHandle) : null;
          const opts =
            rawOpts && typeof rawOpts === "object" ? (rawOpts as AgentCallOpts) : undefined;

          const deferred = ctx.newPromise();
          const work = (async () => {
            try {
              if (agentCalls >= input.limits.maxAgentsPerRun) {
                throw new Error(
                  `workflow exceeded maxAgentsPerRun (${input.limits.maxAgentsPerRun})`,
                );
              }
              agentCalls++;
              const result = await limit(() => input.host.agent(prompt, opts));
              const valueHandle = marshalToGuest(ctx, result);
              deferred.resolve(valueHandle);
              valueHandle.dispose();
            } catch (err) {
              const errHandle = ctx.newString(err instanceof Error ? err.message : String(err));
              deferred.reject(errHandle);
              errHandle.dispose();
            }
          })();
          inflight.add(work);
          void work.finally(() => inflight.delete(work));
          // Return the promise to the guest; the VM takes ownership of the
          // handle. resolve/reject handles are freed when the context disposes.
          return deferred.handle;
        });
        ctx.setProp(ctx.global, "__host_agent", agentFn);
        agentFn.dispose();

        const logFn = ctx.newFunction("__host_log", (msgHandle) => {
          input.host.log(String(ctx.dump(msgHandle)));
          return ctx.undefined;
        });
        ctx.setProp(ctx.global, "__host_log", logFn);
        logFn.dispose();

        const phaseFn = ctx.newFunction("__host_phase", (titleHandle) => {
          input.host.phase(String(ctx.dump(titleHandle)));
          return ctx.undefined;
        });
        ctx.setProp(ctx.global, "__host_phase", phaseFn);
        phaseFn.dispose();

        const argsHandle = marshalToGuest(ctx, input.args);
        ctx.setProp(ctx.global, "args", argsHandle);
        argsHandle.dispose();

        // ── Run + pump ──────────────────────────────────────────────────────
        const programPromise = ctx.unwrapResult(
          ctx.evalCode(buildProgram(input.scriptSource), "workflow.js"),
        );

        let settled: SandboxResult | undefined;
        void ctx.resolvePromise(programPromise).then((result) => {
          try {
            const valueHandle = ctx.unwrapResult(result);
            settled = { ok: true, returnValue: ctx.dump(valueHandle) };
            valueHandle.dispose();
          } catch (err) {
            settled = {
              ok: false,
              returnValue: null,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        });

        // Drive the guest job queue until the program promise settles. Wake on
        // any in-flight host op completing; fall back to a macrotask yield.
        while (settled === undefined && Date.now() <= deadline) {
          ctx.runtime.executePendingJobs();
          if (settled !== undefined) break;
          const waiters = [...inflight];
          await (waiters.length ? Promise.race([...waiters, macrotask()]) : macrotask());
        }
        // Final pump so the resolvePromise continuation can land.
        ctx.runtime.executePendingJobs();
        await macrotask();

        return (
          settled ?? {
            ok: false,
            returnValue: null,
            error: `workflow timed out after ${input.limits.timeoutMs}ms`,
          }
        );
      } catch (err) {
        return {
          ok: false,
          returnValue: null,
          error: err instanceof Error ? err.message : String(err),
        };
      } finally {
        ctx.dispose();
      }
    },
  };
}
