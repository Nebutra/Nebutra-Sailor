"use client";

import { Table } from "@nebutra/ui/primitives";
import { Aside, DemoPage, LONG_LABEL, Stack, State } from "../demo-kit";

const ROWS = [
  { region: "Washington, D.C.", requests: 1_284_902, errorRate: "0.02%" },
  { region: "San Francisco", requests: 918_233, errorRate: "0.04%" },
  { region: "Frankfurt", requests: 620_118, errorRate: "0.11%" },
  { region: "Tokyo", requests: 402_771, errorRate: "0.07%" },
];

export default function TableDemo() {
  return (
    <DemoPage>
      <State
        breaks="Numeric columns left-aligned, so the digits do not line up and a total cannot be scanned. The numeric prop is what fixes it, on both the head and the cell."
        id="default"
        note="Compound parts. numeric right-aligns and switches to tabular figures."
        title="Default"
      >
        <div className="max-w-2xl">
          <Table>
            <Table.Caption>API traffic by region, last 24 hours.</Table.Caption>
            <Table.Header>
              <Table.Row>
                <Table.Head>Region</Table.Head>
                <Table.Head numeric>Requests</Table.Head>
                <Table.Head numeric>Error rate</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body bordered interactive>
              {ROWS.map((row) => (
                <Table.Row key={row.region}>
                  <Table.Cell>{row.region}</Table.Cell>
                  <Table.Cell numeric>{row.requests.toLocaleString()}</Table.Cell>
                  <Table.Cell numeric>{row.errorRate}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </State>

      <State
        breaks="Zebra striping hand-applied per row, which is how 28 files in this repo ended up with slightly different stripes. striped is a prop."
        id="density"
        note="The same data with the body-level presentation props on and off."
        title="Striped, bordered, interactive"
      >
        <Stack>
          {(
            [
              { label: "plain", props: {} },
              { label: "striped", props: { striped: true } },
              { label: "bordered + interactive", props: { bordered: true, interactive: true } },
            ] as const
          ).map((config) => (
            <div key={config.label}>
              <div className="mb-2 font-mono text-[11px] text-muted-foreground">{config.label}</div>
              <div className="max-w-2xl">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Region</Table.Head>
                      <Table.Head numeric>Requests</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body {...config.props}>
                    {ROWS.map((row) => (
                      <Table.Row key={row.region}>
                        <Table.Cell>{row.region}</Table.Cell>
                        <Table.Cell numeric>{row.requests.toLocaleString()}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          ))}
        </Stack>
      </State>

      <State
        breaks="A table with no rows collapsing to a bare header, which reads as a broken page rather than an intentional empty state. Table does not supply this — the caller must."
        id="empty"
        note="Table has no empty-state prop. This is the header-plus-message shape a caller has to build; EmptyState is the component for the message."
        title="Empty"
      >
        <div className="max-w-2xl">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Region</Table.Head>
                <Table.Head numeric>Requests</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <Table.Row>
                <Table.Cell colSpan={2}>
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    No traffic recorded in this window.
                  </div>
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </div>
      </State>

      <State
        breaks="A wide table that makes the page scroll sideways. The table must scroll inside its own container; the body must not. Narrow your window on this one."
        id="overflow"
        note="Eight columns and a long cell value in a constrained container with overflow-x on the wrapper."
        title="Overflow — wide table and long cells"
      >
        <div className="max-w-md overflow-x-auto rounded-lg bg-background p-3">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Deployment</Table.Head>
                <Table.Head>Branch</Table.Head>
                <Table.Head>Commit</Table.Head>
                <Table.Head>Author</Table.Head>
                <Table.Head numeric>Duration</Table.Head>
                <Table.Head numeric>Size</Table.Head>
                <Table.Head>Status</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body striped>
              <Table.Row>
                <Table.Cell>{LONG_LABEL}</Table.Cell>
                <Table.Cell>feat/analytics-cluster-eu-central-1</Table.Cell>
                <Table.Cell>a1b2c3d</Table.Cell>
                <Table.Cell>ada</Table.Cell>
                <Table.Cell numeric>4m 12s</Table.Cell>
                <Table.Cell numeric>18.4 MB</Table.Cell>
                <Table.Cell>Ready</Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>api-gateway</Table.Cell>
                <Table.Cell>main</Table.Cell>
                <Table.Cell>9f8e7d6</Table.Cell>
                <Table.Cell>grace</Table.Cell>
                <Table.Cell numeric>1m 03s</Table.Cell>
                <Table.Cell numeric>2.1 MB</Table.Cell>
                <Table.Cell>Ready</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table>
        </div>
      </State>

      <Aside title="The most-bypassed component in the library">
        <p>
          The component census counted 28 files across seven apps writing raw{" "}
          <code>&lt;table&gt;</code> markup with manual striping while this primitive — with{" "}
          <code>striped</code>, <code>bordered</code> and <code>interactive</code> already on it —
          sat unused. There is no keyboard path here because a static table has none; a sortable
          header or a row action would introduce one, and neither is part of this primitive.
        </p>
      </Aside>
    </DemoPage>
  );
}
