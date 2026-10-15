import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { Card, Table } from "@nebutra/ui/primitives";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";

const rows = [
  ["trace-store", "trace:doctor", ".nebutra/debug/trace-store.jsonl"],
  ["sandbox-runtime", "sandbox:doctor", ".nebutra/debug/sandbox-runtime.jsonl"],
  ["content-store", "content:doctor", ".nebutra/debug/content-store.jsonl"],
  ["event-log", "chronos:timeline", ".nebutra/debug/event-log.jsonl"],
] as const;

export default async function Layer0DemoPage() {
  const tc = await getTranslations("copy.layer0Page");
  await connection();
  const enabled = await isFeatureEnabled(FLAGS.LAYER0_DEMO);

  if (!enabled) {
    return (
      <main className="min-h-dvh bg-muted p-8 text-foreground">
        <div className="mx-auto max-w-4xl">
          <Card className="p-6">
            <h1 className="font-semibold text-xl">{tc("layerDemoDisabled")}</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              <code>{FLAGS.LAYER0_DEMO}</code> {tc("isOffByDefault")}
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-muted p-8 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <h1 className="font-semibold text-2xl">{tc("layerCapabilityLoop")}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{tc("providerGatewayTraceSandbox")}</p>
        </header>

        <Card className="p-6">
          <Table bare>
            <Table.Header>
              <Table.Row>
                <Table.Head>{tc("capability")}</Table.Head>
                <Table.Head>{tc("doctor")}</Table.Head>
                <Table.Head alignment="start">{tc("debugFile")}</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body bordered>
              {rows.map(([capability, doctor, debug]) => (
                <Table.Row key={capability}>
                  <Table.Cell>
                    <code>{capability}</code>
                  </Table.Cell>
                  <Table.Cell>
                    <code>{doctor}</code>
                  </Table.Cell>
                  <Table.Cell alignment="start">
                    <code>{debug}</code>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium">{tc("integrationCommand")}</h2>
          <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">
            {tc("pnpmLayer0Demo")}
          </pre>
        </Card>
      </div>
    </main>
  );
}
