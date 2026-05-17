import { ContentStore } from "@nebutra/content-store";
import { EventLog } from "@nebutra/event-log";
import { LlmGateway } from "@nebutra/llm-gateway";
import { ProviderRegistry } from "@nebutra/provider-registry";
import { SandboxRuntime } from "@nebutra/sandbox-runtime";
import { TraceStore } from "@nebutra/trace-store";

type SuggestedError = Error & {
  readonly code?: string;
  readonly statusCode?: number;
  readonly suggestion?: string;
  readonly metadata?: Record<string, unknown>;
};

const tenantId = process.env.LAYER0_TENANT_ID ?? "local";
const threadId = "layer0_demo_thread";
const root = ".nebutra/layer0-demo";

async function main() {
  const provider = ProviderRegistry.default().get("local");
  const gateway = new LlmGateway({ providers: [provider] });
  const trace = TraceStore.default();
  const runtime = SandboxRuntime.fromConfig();
  const store = await ContentStore.open(root, { tenantId });
  const log = await EventLog.open(`${root}/.chronos`, { tenantId });

  const span = trace.start("agent", "layer0_demo", { traceId: threadId, tenantId });

  try {
    const response = await gateway.complete({
      capability: "local",
      budgetUsd: 0.05,
      messages: [{ role: "user", content: "Write a hello.md saying hi." }],
    });

    await store.write("hello.md", "hi");

    const eventId = await log.commit({
      traceId: threadId,
      kind: "tool_call",
      affected: ["hello.md"],
      parent: null,
      snapshot: { "hello.md": "hi" },
    });

    const sandbox = await runtime.exec({
      cmd: "echo sandbox ok",
      tenantId,
      threadId,
      hints: { needsGpu: false },
    });

    const hits = await store.search().query("hi").topK(5);
    const rollback = await log.rollbackTo(eventId);

    span.end({
      responseLength: response.text.length,
      sandbox: sandbox.executedOn,
      hits: hits.length,
      eventId,
    });
    await trace.flush();

    process.stdout.write(
      `${JSON.stringify(
        {
          provider: provider.id,
          gatewayUsage: gateway.usageReport(),
          response: response.text,
          sandbox,
          hits,
          eventId,
          rollback,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    span.fail(error);
    await trace.flush();
    throw error;
  }
}

main().catch((error) => {
  if (error instanceof Error) {
    const suggested = error as SuggestedError;
    process.stderr.write(
      `${JSON.stringify(
        {
          ok: false,
          name: suggested.name,
          code: suggested.code,
          statusCode: suggested.statusCode,
          message: suggested.message,
          suggestion:
            suggested.suggestion ??
            "Run the relevant `pnpm <codename>:doctor` command and retry the Layer 0 demo.",
          metadata: suggested.metadata,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    process.stderr.write(
      `${JSON.stringify(
        {
          ok: false,
          message: String(error),
          suggestion:
            "Run the relevant `pnpm <codename>:doctor` command and retry the Layer 0 demo.",
        },
        null,
        2,
      )}\n`,
    );
  }
  process.exitCode = 1;
});
