"use client";

import { Inbox } from "@nebutra/icons";
import {
  Badge,
  Button,
  DataList,
  type DataListColumn,
  type DataListStatus,
  EmptyStateIcon,
} from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  ControlButton,
  Controls,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  State,
} from "../demo-kit";

interface Deploy {
  id: string;
  name: string;
  branch: string;
  status: "Ready" | "Building" | "Failed";
  seconds: number;
}

const DEPLOYS: Deploy[] = [
  { id: "d_1042", name: "acme-web", branch: "main", status: "Ready", seconds: 48 },
  { id: "d_1041", name: "acme-web", branch: "fix/checkout", status: "Building", seconds: 112 },
  { id: "d_1040", name: "acme-docs", branch: "main", status: "Ready", seconds: 31 },
  { id: "d_1039", name: "acme-api", branch: "release/2.4", status: "Failed", seconds: 7 },
];

const STATUS_VARIANT = {
  Ready: "green-subtle",
  Building: "amber-subtle",
  Failed: "red-subtle",
} as const;

const COLUMNS: DataListColumn<Deploy>[] = [
  { id: "name", header: "Project", cell: (row) => row.name },
  { id: "branch", header: "Branch", cell: (row) => <code className="text-xs">{row.branch}</code> },
  {
    id: "status",
    header: "Status",
    cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>,
  },
  { id: "seconds", header: "Build", align: "end", numeric: true, cell: (row) => `${row.seconds}s` },
];

const WIDE_COLUMNS: DataListColumn<Deploy>[] = [
  ...COLUMNS,
  ...COLUMNS.map((column) => ({ ...column, id: `${column.id}-2` })),
];

const LONG_ROWS: Deploy[] = [
  { id: "d_1", name: LONG_LABEL, branch: "main", status: "Ready", seconds: 48 },
  ...DEPLOYS.slice(1, 3),
];

const getRowKey = (row: Deploy) => row.id;

export default function DataListDemo() {
  const [status, setStatus] = React.useState<DataListStatus>("idle");
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [retrying, setRetrying] = React.useState(false);

  const retry = () => {
    setRetrying(true);
    window.setTimeout(() => setRetrying(false), 1200);
  };

  return (
    <DemoPage>
      <State
        breaks="Columns that stop lining up: figures not in tabular numerals, or a header that does not share its column's alignment."
        code={`<DataList columns={columns} getRowKey={(row) => row.id} label="Deployments" rows={deploys} />`}
        id="default"
        note="The Build column is numeric and end-aligned, in header and cells alike."
        title="Default"
      >
        <DataList<Deploy>
          columns={COLUMNS}
          getRowKey={getRowKey}
          label="Deployments"
          rows={DEPLOYS}
        />
      </State>

      <State
        breaks="Bodies of different heights, so the page jumps when a list moves between loading, empty, error and rows. Flip through the states and watch the content below."
        code={`<DataList status="loading" minBodyRows={5} rowHeight={44} ... />`}
        id="states"
        note="Loading, empty and error all reserve minBodyRows x rowHeight. The line under the list does not move between them."
        title="Status — no layout jump"
      >
        <Controls>
          {(["idle", "loading", "empty", "error"] as const).map((value) => (
            <ControlButton active={status === value} key={value} onClick={() => setStatus(value)}>
              {value}
            </ControlButton>
          ))}
        </Controls>
        <DataList<Deploy>
          columns={COLUMNS}
          emptyDescription="Deployments appear here once you push."
          emptyTitle="No deployments yet"
          error={status === "error" ? "Could not load deployments." : undefined}
          getRowKey={getRowKey}
          label="Deployments by status"
          onRetry={() => setStatus("loading")}
          rows={DEPLOYS}
          status={status === "error" ? undefined : status}
        />
        <p className="mt-3 text-muted-foreground text-xs">This line stays where it is.</p>
      </State>

      <State
        breaks="A background refetch that unmounts the rows, losing scroll position and focus, or an optimistic mutation that flashes the skeleton. isRefreshing dims the mounted rows and shows a 2px shimmer; status loading replaces them."
        code={`<DataList isRefreshing={isFetching} rows={deploys} ... />`}
        id="refreshing"
        note="Toggle isRefreshing. Rows stay mounted and dim; a thin bar pulses along the top edge and takes no layout space."
        title="Refreshing keeps rows mounted"
      >
        <Controls>
          <ControlButton active={refreshing} onClick={() => setRefreshing((v) => !v)}>
            isRefreshing
          </ControlButton>
        </Controls>
        <DataList<Deploy>
          columns={COLUMNS}
          getRowKey={getRowKey}
          isRefreshing={refreshing}
          label="Deployments, refreshing"
          rows={DEPLOYS}
        />
      </State>

      <State
        breaks="State precedence decided twice, in two places. error wins over status loading, and an error given as null does not count as an error. The left list is told status loading and given an error; it shows the error."
        id="precedence"
        note="error > loading > empty > rows. An error given as null or an empty string counts as no error, so a string-or-null value from a query hook can be passed straight through."
        title="Precedence"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <DataList<Deploy>
            columns={COLUMNS.slice(0, 2)}
            error="Could not load deployments."
            getRowKey={getRowKey}
            label="Error beats loading"
            minBodyRows={3}
            rows={DEPLOYS}
            status="loading"
          />
          <DataList<Deploy>
            columns={COLUMNS.slice(0, 2)}
            error={null}
            getRowKey={getRowKey}
            label="Null error"
            minBodyRows={3}
            rows={DEPLOYS}
          />
        </div>
      </State>

      <State
        breaks="An empty body that is a bare line of text with no way forward, or one whose icon is announced. The icon sits in an aria-hidden tile, so the title carries the meaning."
        code={`<DataList
  emptyAction={<Button size="sm" variant="outline">New deployment</Button>}
  emptyDescription="Deployments appear here once you push."
  emptyIcon={<EmptyStateIcon icon={<Inbox />} />}
  emptyTitle="No deployments yet"
  rows={[]}
/>`}
        id="empty"
        title="Empty with icon and action"
      >
        <DataList<Deploy>
          columns={COLUMNS}
          emptyAction={
            <Button size="sm" variant="outline">
              New deployment
            </Button>
          }
          emptyDescription="Deployments appear here once you push."
          emptyIcon={<EmptyStateIcon icon={<Inbox />} />}
          emptyTitle="No deployments yet"
          getRowKey={getRowKey}
          label="Empty deployments"
          rows={[]}
        />
      </State>

      <State
        breaks="An error with no way to recover, or a retry that leaves the old error on screen while it runs. Press Try again: the list goes to loading, then back to the error."
        code={`<DataList error="Could not load deployments." onRetry={refetch} retryLabel="Try again" ... />`}
        id="error"
        note="onRetry adds the button; retryLabel is the string to translate. The error body is a polite live region."
        title="Error with retry"
      >
        <DataList<Deploy>
          columns={COLUMNS}
          error={retrying ? undefined : "Could not load deployments."}
          errorTitle="Deployments failed to load"
          getRowKey={getRowKey}
          label="Deployments, error"
          onRetry={retry}
          rows={DEPLOYS}
          status={retrying ? "loading" : undefined}
        />
      </State>

      <State
        breaks="Rows that look clickable but cannot be reached by keyboard, or that activate on Space and scroll the page too. With onRowClick the rows take focus, and Enter and Space activate them."
        code={`<DataList onRowClick={(row) => setSelectedId(row.id)} ... />`}
        id="interactive"
        title="Clickable rows — keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "Moves focus to the first row, then to each row in turn." },
            { keys: "Enter or Space", does: "Calls onRowClick for the focused row." },
          ]}
        >
          <DataList<Deploy>
            columns={COLUMNS}
            getRowKey={getRowKey}
            label="Clickable deployments"
            onRowClick={(row) => setSelectedId(row.id)}
            rows={DEPLOYS}
          />
          <p className="mt-3 text-muted-foreground text-xs">
            {selectedId ? `Selected: ${selectedId}` : "Nothing selected yet."}
          </p>
        </KeyboardPath>
      </State>

      <State
        breaks="Striping that fights the hover tint, or a hover tint on rows that do nothing. interactive adds the tint without making rows focusable; onRowClick implies it."
        code={`<DataList striped interactive ... />`}
        id="striped"
        title="Striped and interactive"
      >
        <DataList<Deploy>
          columns={COLUMNS}
          getRowKey={getRowKey}
          interactive
          label="Striped deployments"
          rows={DEPLOYS}
          striped
        />
      </State>

      <State
        breaks="A pagination control that is squeezed or has no room. The footer is an opaque slot set off by margin; the list does not care what is in it."
        code={`<DataList pagination={<Pagination ... />} ... />`}
        id="pagination"
        title="Pagination slot"
      >
        <DataList<Deploy>
          columns={COLUMNS}
          getRowKey={getRowKey}
          label="Paged deployments"
          pagination={
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Showing 4 of 24</span>
              <span>Page 1 of 6</span>
            </div>
          }
          rows={DEPLOYS}
        />
      </State>

      <State
        breaks="A wide table that widens the page instead of scrolling inside itself. The scroll container is the list's own, so the wide content scrolls here and the page stays put."
        id="overflow-wide"
        note="Eight columns in a narrow container."
        title="Overflow — wide table"
      >
        <div className="max-w-sm">
          <DataList<Deploy>
            columns={WIDE_COLUMNS}
            getRowKey={getRowKey}
            label="Wide deployments"
            rows={DEPLOYS}
          />
        </div>
      </State>

      <State
        breaks="A long cell that stretches its row unpredictably. Cell content wraps inside its column and the row grows past rowHeight; it is a floor, not a cap."
        id="overflow-long"
        note="rowHeight is applied as a height on each cell, so wrapped text makes the row taller instead of being cut."
        title="Overflow — long cell content"
      >
        <div className="max-w-md">
          <DataList<Deploy>
            columns={COLUMNS.slice(0, 3)}
            getRowKey={getRowKey}
            label="Long names"
            rows={LONG_ROWS}
          />
        </div>
      </State>

      <State
        breaks="Row height and the reserved floor disagreeing: loading rows, the empty body and the error body are all minBodyRows x rowHeight, whatever the row height."
        id="density"
        note="Three row heights, each loading with minBodyRows 3."
        title="Row height"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[36, 44, 56].map((height) => (
            <DataList<Deploy>
              columns={COLUMNS.slice(0, 2)}
              getRowKey={getRowKey}
              key={height}
              label={`${height}px rows`}
              minBodyRows={3}
              rowHeight={height}
              rows={DEPLOYS}
              status="loading"
            />
          ))}
        </div>
      </State>

      <State
        breaks="Alignment written with physical left and right. justify-start flips with direction but the text-left class and the header corner radii do not, so the end column and the header band corners are what to check."
        id="rtl"
        note="Worth checking by eye in a right-to-left document: column order mirrors, but the header band's rounded corners and text-left do not."
        title="Right-to-left"
      >
        <div dir="rtl">
          <DataList<Deploy>
            columns={COLUMNS}
            getRowKey={getRowKey}
            label="Deployments, RTL"
            rows={DEPLOYS}
          />
        </div>
      </State>

      <Aside title="Why a list and not a table">
        <p>
          DataList renders a real <code>table</code>, so rows and cells keep their semantics. It is
          the shared surface for loading, empty and error bodies. For plain tabular markup with no
          state handling, use <code>Table</code> directly.
        </p>
      </Aside>
    </DemoPage>
  );
}
