import { FLAGS, isFeatureEnabled } from "@nebutra/feature-flags";
import { Card } from "@nebutra/ui/layout";
import { connection } from "next/server";

const rows = [
  ["trace-store", "trace:doctor", ".nebutra/debug/trace-store.jsonl"],
  ["sandbox-runtime", "sandbox:doctor", ".nebutra/debug/sandbox-runtime.jsonl"],
  ["content-store", "content:doctor", ".nebutra/debug/content-store.jsonl"],
  ["event-log", "chronos:timeline", ".nebutra/debug/event-log.jsonl"],
] as const;

export default async function Layer0DemoPage() {
  await connection();
  const enabled = await isFeatureEnabled(FLAGS.LAYER0_DEMO);

  if (!enabled) {
    return (
      <main className="min-h-screen bg-muted p-8 text-foreground">
        <div className="mx-auto max-w-4xl">
          <Card className="p-6">
            <h1 className="font-semibold text-xl">Layer 0 demo disabled</h1>
            <p className="mt-2 text-muted-foreground text-sm">
              <code>{FLAGS.LAYER0_DEMO}</code> is off by default.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted p-8 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <h1 className="font-semibold text-2xl">Layer 0 capability loop</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Provider, gateway, trace, sandbox, content, and event contracts are wired through
            tenant-scoped local defaults.
          </p>
        </header>

        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">Capability</th>
                  <th className="py-2">Doctor</th>
                  <th className="py-2">Debug file</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([capability, doctor, debug]) => (
                  <tr key={capability} className="border-border border-t">
                    <td className="py-2">
                      <code>{capability}</code>
                    </td>
                    <td className="py-2">
                      <code>{doctor}</code>
                    </td>
                    <td className="py-2">
                      <code>{debug}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-medium">Integration command</h2>
          <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">pnpm layer0:demo</pre>
        </Card>
      </div>
    </main>
  );
}
