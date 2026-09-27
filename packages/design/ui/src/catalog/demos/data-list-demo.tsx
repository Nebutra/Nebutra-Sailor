"use client";

import { Badge, DataList, type DataListColumn } from "@nebutra/ui/primitives";

interface Endpoint {
  id: string;
  route: string;
  method: string;
  p95: number;
  status: "healthy" | "degraded";
}

const ROWS: Endpoint[] = [
  { id: "1", route: "/v1/invoices", method: "GET", p95: 84, status: "healthy" },
  { id: "2", route: "/v1/invoices", method: "POST", p95: 212, status: "healthy" },
  { id: "3", route: "/v1/usage", method: "GET", p95: 640, status: "degraded" },
  { id: "4", route: "/v1/webhooks", method: "POST", p95: 131, status: "healthy" },
];

const COLUMNS: DataListColumn<Endpoint>[] = [
  {
    id: "route",
    header: "Route",
    cell: (row) => <span className="font-mono text-xs">{row.route}</span>,
  },
  { id: "method", header: "Method", cell: (row) => row.method },
  { id: "p95", header: "p95", align: "end", numeric: true, cell: (row) => `${row.p95} ms` },
  {
    id: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant={row.status === "healthy" ? "green-subtle" : "amber-subtle"} size="sm">
        {row.status}
      </Badge>
    ),
  },
];

export function DataListDemo() {
  return (
    <div className="w-full p-6">
      <DataList columns={COLUMNS} rows={ROWS} getRowKey={(row) => row.id} />
    </div>
  );
}
