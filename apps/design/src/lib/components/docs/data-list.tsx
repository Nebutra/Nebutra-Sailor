"use client";

import { Inbox } from "@nebutra/icons";
import {
  Button,
  DataList,
  type DataListColumn,
  type DataListStatus,
  EmptyStateIcon,
} from "@nebutra/ui/primitives";
import * as React from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

interface Deploy {
  id: string;
  name: string;
  branch: string;
  status: string;
  seconds: number;
}

const DEPLOYS: Deploy[] = [
  { id: "d_1042", name: "acme-web", branch: "main", status: "Ready", seconds: 48 },
  { id: "d_1041", name: "acme-web", branch: "fix/checkout", status: "Building", seconds: 112 },
  { id: "d_1040", name: "acme-docs", branch: "main", status: "Ready", seconds: 31 },
  { id: "d_1039", name: "acme-api", branch: "release/2.4", status: "Failed", seconds: 7 },
];

const COLUMNS: DataListColumn<Deploy>[] = [
  { id: "name", header: "Project", cell: (row) => row.name },
  { id: "branch", header: "Branch", cell: (row) => row.branch },
  { id: "status", header: "Status", cell: (row) => row.status },
  { id: "seconds", header: "Build", align: "end", numeric: true, cell: (row) => `${row.seconds}s` },
];

const COLUMNS_SOURCE = `const columns: DataListColumn<Deploy>[] = [
  { id: "name", header: "Project", cell: (row) => row.name },
  { id: "branch", header: "Branch", cell: (row) => row.branch },
  { id: "status", header: "Status", cell: (row) => row.status },
  { id: "seconds", header: "Build", align: "end", numeric: true, cell: (row) => \`\${row.seconds}s\` },
];`;

const TYPE_SOURCE = `interface Deploy {
  id: string;
  name: string;
  branch: string;
  status: string;
  seconds: number;
}`;

const PAGINATION = <span className="text-muted-foreground text-xs">Showing 4 of 24</span>;
const PAGINATION_SOURCE = '<span className="text-muted-foreground text-xs">Showing 4 of 24</span>';

const getRowKey = (row: Deploy) => row.id;

/** Holds the clicked row and retry count so those callbacks have a visible result. */
function LiveList({
  clickable,
  retryable,
  ...props
}: { clickable: boolean; retryable: boolean } & Omit<
  React.ComponentProps<typeof DataList<Deploy>>,
  "columns" | "getRowKey" | "onRowClick" | "onRetry"
>) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [retries, setRetries] = React.useState(0);
  return (
    <div className="flex w-[34rem] max-w-full flex-col gap-2">
      <DataList<Deploy>
        {...props}
        columns={COLUMNS}
        getRowKey={getRowKey}
        {...(clickable ? { onRowClick: (row: Deploy) => setSelectedId(row.id) } : {})}
        {...(retryable ? { onRetry: () => setRetries((count) => count + 1) } : {})}
      />
      {selectedId ? <p className="text-muted-foreground text-xs">Selected: {selectedId}</p> : null}
      {retries > 0 ? (
        <p className="text-muted-foreground text-xs">Retry pressed {retries} time(s).</p>
      ) : null}
    </div>
  );
}

const KNOBS: Knob[] = [
  {
    name: "status",
    type: "select",
    options: ["auto", "idle", "loading", "empty", "error"],
    defaultValue: "auto",
    hint: "auto leaves status unset, so it is derived from error and rows.",
  },
  { name: "rows", type: "select", options: ["4", "2", "0"], defaultValue: "4" },
  {
    name: "isRefreshing",
    type: "boolean",
    defaultValue: false,
    hint: "Dims mounted rows and shows a 2px shimmer. Rows stay mounted.",
  },
  { name: "striped", type: "boolean", defaultValue: false },
  { name: "interactive", type: "boolean", defaultValue: false },
  {
    name: "clickable",
    label: "onRowClick",
    type: "boolean",
    defaultValue: false,
    hint: "Rows become focusable and respond to Enter and Space.",
  },
  {
    name: "error",
    type: "text",
    defaultValue: "",
    hint: "Any text switches the list to the error body.",
  },
  { name: "retry", label: "onRetry", type: "boolean", defaultValue: false },
  { name: "emptyTitle", type: "text", defaultValue: "Nothing here" },
  { name: "emptyDescription", type: "text", defaultValue: "" },
  { name: "emptyIcon", type: "boolean", defaultValue: false },
  { name: "emptyAction", type: "boolean", defaultValue: false },
  { name: "pagination", type: "boolean", defaultValue: false },
  { name: "minBodyRows", type: "select", options: ["3", "5", "8"], defaultValue: "5" },
  { name: "rowHeight", type: "select", options: ["36", "44", "56"], defaultValue: "44" },
  { name: "label", type: "text", defaultValue: "Deployments" },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Switch status, rows and error to move between bodies: every body is the same height (minBodyRows x rowHeight), so the list does not jump. Precedence is error, then loading, then empty, then rows."
      code={(v) => {
        const count = Number(v.rows);
        const status = String(v.status);
        const rows = DEPLOYS.slice(0, count);
        const lines = [
          TYPE_SOURCE,
          `const deploys: Deploy[] = ${JSON.stringify(rows, null, 2)};`,
          COLUMNS_SOURCE,
        ];
        if (v.clickable) {
          lines.push("const [selectedId, setSelectedId] = useState<string | null>(null);");
        }
        if (v.retry) {
          lines.push(
            "const retry = () => {\n  // Refetch the rows here; keep the error until the request settles.\n};",
          );
        }
        return snippet({
          imports: [
            {
              names: [
                "DataList",
                "type DataListColumn",
                ...(v.emptyAction ? ["Button"] : []),
                ...(v.emptyIcon ? ["EmptyStateIcon"] : []),
              ],
              from: "@nebutra/ui/primitives",
            },
            ...(v.emptyIcon ? [{ names: ["Inbox"], from: "@nebutra/icons" }] : []),
            ...(v.clickable ? [{ names: ["useState"], from: "react" }] : []),
          ],
          body: `${lines.join("\n\n")}\n\n${jsx({
            name: "DataList",
            defaults: {
              isRefreshing: false,
              striped: false,
              interactive: false,
              minBodyRows: 5,
              rowHeight: 44,
              emptyTitle: "Nothing here",
            },
            props: {
              columns: raw("columns"),
              rows: raw("deploys"),
              getRowKey: raw("(row) => row.id"),
              label: String(v.label) || undefined,
              status: status === "auto" ? undefined : status,
              isRefreshing: v.isRefreshing,
              error: String(v.error) || undefined,
              onRetry: v.retry ? raw("retry") : undefined,
              emptyTitle: String(v.emptyTitle),
              emptyDescription: String(v.emptyDescription) || undefined,
              emptyIcon: v.emptyIcon ? raw("<EmptyStateIcon icon={<Inbox />} />") : undefined,
              emptyAction: v.emptyAction
                ? raw('<Button size="sm" variant="outline">New deployment</Button>')
                : undefined,
              minBodyRows: Number(v.minBodyRows),
              rowHeight: Number(v.rowHeight),
              pagination: v.pagination ? raw(PAGINATION_SOURCE) : undefined,
              striped: v.striped,
              interactive: v.interactive,
              onRowClick: v.clickable ? raw("(row) => setSelectedId(row.id)") : undefined,
            },
          })}`,
        });
      }}
      knobs={KNOBS}
      render={(v) => {
        const status = String(v.status);
        return (
          <LiveList
            clickable={Boolean(v.clickable)}
            emptyTitle={String(v.emptyTitle)}
            interactive={Boolean(v.interactive)}
            isRefreshing={Boolean(v.isRefreshing)}
            minBodyRows={Number(v.minBodyRows)}
            retryable={Boolean(v.retry)}
            rowHeight={Number(v.rowHeight)}
            rows={DEPLOYS.slice(0, Number(v.rows))}
            striped={Boolean(v.striped)}
            {...present({
              emptyAction: v.emptyAction ? (
                <Button size="sm" variant="outline">
                  New deployment
                </Button>
              ) : undefined,
              emptyDescription: String(v.emptyDescription) || undefined,
              emptyIcon: v.emptyIcon ? <EmptyStateIcon icon={<Inbox />} /> : undefined,
              error: String(v.error) || undefined,
              label: String(v.label) || undefined,
              pagination: v.pagination ? PAGINATION : undefined,
              status: status === "auto" ? undefined : (status as DataListStatus),
            })}
          />
        );
      }}
      stageClassName="items-start"
    />
  );
}

const COLUMN_STATES = [
  { id: "rows", label: "Rows" },
  { id: "refreshing", label: "Refreshing" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty" },
  { id: "error", label: "Error" },
  { id: "interactive", label: "Clickable rows" },
];

const DENSITY = [
  { id: "36", label: "36px rows" },
  { id: "44", label: "44px rows" },
  { id: "56", label: "56px rows" },
];

const MATRIX_COLUMNS: DataListColumn<Deploy>[] = [
  { id: "name", header: "Project", cell: (row) => row.name },
  { id: "seconds", header: "Build", align: "end", numeric: true, cell: (row) => `${row.seconds}s` },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMN_STATES}
      note="DataList is read-only: there is no disabled prop. Every body reserves minBodyRows (3 here) x the row height, so a column keeps its height as the state changes. Refreshing keeps rows mounted and dims them. Hover and Tab are live on the clickable column."
      render={(density, column) => (
        <div className="w-64">
          <DataList<Deploy>
            columns={MATRIX_COLUMNS}
            getRowKey={getRowKey}
            interactive={column === "interactive"}
            isRefreshing={column === "refreshing"}
            label={`${density}px ${column} deployments`}
            minBodyRows={3}
            rowHeight={Number(density)}
            rows={column === "empty" ? [] : DEPLOYS.slice(0, 3)}
            {...present({
              emptyDescription: column === "empty" ? "Deployments appear here." : undefined,
              error: column === "error" ? "Could not load deployments." : undefined,
              onRetry: column === "error" ? () => {} : undefined,
              onRowClick: column === "interactive" ? () => {} : undefined,
              status: column === "loading" ? ("loading" as const) : undefined,
            })}
          />
        </div>
      )}
      rows={DENSITY}
      rowsLabel="Row height"
    />
  );
}
