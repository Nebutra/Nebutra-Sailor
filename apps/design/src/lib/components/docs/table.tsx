"use client";

import { Table } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const ROWS = [
  { region: "Washington, D.C.", requests: "1,284,902", errors: "0.02%" },
  { region: "San Francisco", requests: "918,233", errors: "0.04%" },
  { region: "Frankfurt", requests: "620,118", errors: "0.11%" },
  { region: "Tokyo", requests: "402,771", errors: "0.07%" },
];

const KNOBS: Knob[] = [
  { name: "striped", type: "boolean", defaultValue: false, hint: "Table.Body" },
  { name: "bordered", type: "boolean", defaultValue: true, hint: "Table.Body" },
  { name: "interactive", type: "boolean", defaultValue: false, hint: "Row hover. Table.Body" },
  {
    name: "numeric",
    type: "boolean",
    defaultValue: true,
    hint: "Right-aligns the number columns.",
  },
  { name: "caption", type: "boolean", defaultValue: true },
  {
    name: "bare",
    type: "boolean",
    defaultValue: false,
    hint: "Drops the frame, for use inside a panel.",
  },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="numeric goes on both the Head and the Cell of a column, so the digits line up."
      code={(v) => {
        const num = v.numeric ? { numeric: true } : {};
        const head = jsx({
          name: "Table.Header",
          props: {},
          children: [
            jsx({
              name: "Table.Row",
              props: {},
              children: [
                jsx({ name: "Table.Head", props: {}, children: "Region" }),
                jsx({ name: "Table.Head", props: num, children: "Requests" }),
                jsx({ name: "Table.Head", props: num, children: "Error rate" }),
              ],
            }),
          ],
        });
        const body = jsx({
          name: "Table.Body",
          props: { striped: v.striped, bordered: v.bordered, interactive: v.interactive },
          children: [
            [
              "{rows.map((row) => (",
              ...jsx({
                name: "Table.Row",
                props: { key: raw("row.region") },
                children: [
                  jsx({ name: "Table.Cell", props: {}, children: raw("row.region") }),
                  jsx({ name: "Table.Cell", props: num, children: raw("row.requests") }),
                  jsx({ name: "Table.Cell", props: num, children: raw("row.errors") }),
                ],
              })
                .split("\n")
                .map((line) => `  ${line}`),
              "))}",
            ].join("\n"),
          ],
        });
        return snippet({
          imports: [{ names: ["Table"], from: "@nebutra/ui/primitives" }],
          body: `const rows = ${JSON.stringify(ROWS, null, 2)};\n\n${jsx({
            name: "Table",
            props: { bare: v.bare },
            children: [
              ...(v.caption
                ? [jsx({ name: "Table.Caption", props: {}, children: "API traffic by region" })]
                : []),
              head,
              body,
            ],
          })}`,
        });
      }}
      knobs={KNOBS}
      render={(v) => (
        <div className="w-full">
          <Table bare={Boolean(v.bare)}>
            {v.caption ? (
              <Table.Caption>API traffic by region, last 24 hours.</Table.Caption>
            ) : null}
            <Table.Header>
              <Table.Row>
                <Table.Head>Region</Table.Head>
                <Table.Head numeric={Boolean(v.numeric)}>Requests</Table.Head>
                <Table.Head numeric={Boolean(v.numeric)}>Error rate</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body
              bordered={Boolean(v.bordered)}
              interactive={Boolean(v.interactive)}
              striped={Boolean(v.striped)}
            >
              {ROWS.map((row) => (
                <Table.Row key={row.region}>
                  <Table.Cell>{row.region}</Table.Cell>
                  <Table.Cell numeric={Boolean(v.numeric)}>{row.requests}</Table.Cell>
                  <Table.Cell numeric={Boolean(v.numeric)}>{row.errors}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
      stageClassName="items-start justify-start"
    />
  );
}

/** Short rows, so four tables fit across the matrix without scrolling. */
const COMPACT_ROWS = [
  ["Frankfurt", "620k"],
  ["Tokyo", "403k"],
  ["Sydney", "118k"],
] as const;

/** Cell padding steps, passed as the table's own CSS variable. */
const DENSITY = [
  { id: "10", label: "10px" },
  { id: "6", label: "6px" },
  { id: "4", label: "4px" },
];

const COLUMNS = [
  { id: "plain", label: "Plain" },
  { id: "striped", label: "Striped" },
  { id: "bordered", label: "Bordered" },
  { id: "interactive", label: "Interactive" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      cellClassName="px-3 align-top"
      columns={COLUMNS}
      note={
        <>
          Rows are cell padding, set through <code>--table-cell-padding-y</code> on the table.
          Columns are the body presentation props. Hover the interactive column to see the row
          state.
        </>
      }
      render={(density, column) => (
        <div className="w-36">
          <Table bare wrapperStyle={{ "--table-cell-padding-y": `${density}px` }}>
            <Table.Header>
              <Table.Row>
                <Table.Head>Region</Table.Head>
                <Table.Head numeric>Req.</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body
              bordered={column === "bordered" || column === "interactive"}
              interactive={column === "interactive"}
              striped={column === "striped"}
            >
              {COMPACT_ROWS.map(([region, requests]) => (
                <Table.Row key={region}>
                  <Table.Cell>{region}</Table.Cell>
                  <Table.Cell numeric>{requests}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
      rows={DENSITY}
      rowsLabel="Cell padding"
    />
  );
}
