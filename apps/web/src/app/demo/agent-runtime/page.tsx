import {
  DEFAULT_APPROVAL_POLICY,
  DEFAULT_CAPABILITY_POLICY,
  METHOD_REGISTRY,
  NoExecutorConfiguredError,
  REFUSING_SANDBOX,
  resolveRuleDecision,
  resolveScope,
  scopeKey,
} from "@nebutra/agent-runtime";
import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { Card } from "@nebutra/ui/layout";
import { Table } from "@nebutra/ui/primitives";
import { connection } from "next/server";

/**
 * Demo route for the @nebutra/agent-runtime grammar.
 *
 * Off by default (FLAGS.AGENT_RUNTIME_DEMO). When disabled, renders a notice
 * and nothing else. When enabled, statically demonstrates the runtime grammar
 * with pure functions only — NO infrastructure, NO untrusted-code execution.
 */
export default async function AgentRuntimeDemoPage() {
  await connection();
  const enabled = await isFeatureEnabled(FLAGS.AGENT_RUNTIME_DEMO);

  if (!enabled) {
    return (
      <main className="min-h-screen bg-muted p-8 text-foreground">
        <div className="mx-auto max-w-4xl">
          <Card className="p-6">
            <h1 className="font-semibold text-xl">Agent Runtime — disabled</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              The <code>agent-runtime</code> capability demo is behind a feature flag (
              <code>{FLAGS.AGENT_RUNTIME_DEMO}</code>) and is off by default. Enable it per tenant
              to view the runtime grammar.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  // ── Pure, infra-free demonstrations ────────────────────────────────────────

  const tenantA = resolveScope(METHOD_REGISTRY.turnStart, "org_a", { threadId: "th_1" });
  const tenantB = resolveScope(METHOD_REGISTRY.turnStart, "org_b", { threadId: "th_1" });

  const ruleRows = (["allow", "prompt", "forbidden"] as const).map((rule) => ({
    rule,
    onRequest: resolveRuleDecision(rule, { kind: "on_request" }),
    never: resolveRuleDecision(rule, { kind: "never" }),
  }));

  let sandboxOutcome = "executed (unexpected)";
  try {
    await REFUSING_SANDBOX.exec({
      tenantId: "org_a",
      threadId: "th_1",
      command: "rm -rf /",
      capabilityPolicy: DEFAULT_CAPABILITY_POLICY,
    });
  } catch (error) {
    sandboxOutcome =
      error instanceof NoExecutorConfiguredError
        ? "refused — no in-process untrusted execution (by design)"
        : "refused";
  }

  return (
    <main className="min-h-screen bg-muted p-8 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <h1 className="font-semibold text-2xl">Agent Runtime grammar</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Faithful, multi-tenant re-expression. Defaults: approval{" "}
            <code>{DEFAULT_APPROVAL_POLICY.kind}</code>, capability{" "}
            <code>{DEFAULT_CAPABILITY_POLICY.kind}</code>.
          </p>
        </header>

        <Card className="p-6">
          <h2 className="font-medium">Tenant + thread serialization isolation</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Same thread id, different tenants — never share a serial lane:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">
            org_a → {scopeKey(tenantA)}
            {"\n"}org_b → {scopeKey(tenantB)}
          </pre>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium">Rule decision × approval policy</h2>
          <Table bare className="mt-3">
            <Table.Header>
              <Table.Row>
                <Table.Head>rule</Table.Head>
                <Table.Head>on_request</Table.Head>
                <Table.Head alignment="start">never</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body bordered>
              {ruleRows.map((r) => (
                <Table.Row key={r.rule}>
                  <Table.Cell>
                    <code>{r.rule}</code>
                  </Table.Cell>
                  <Table.Cell>{r.onRequest}</Table.Cell>
                  <Table.Cell alignment="start">{r.never}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium">External-sandbox seam</h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Default executor outcome for an untrusted command:
          </p>
          <p className="mt-2 font-mono text-sm">{sandboxOutcome}</p>
        </Card>
      </div>
    </main>
  );
}
