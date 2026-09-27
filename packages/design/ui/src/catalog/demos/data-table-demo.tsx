"use client";

import { DataTable } from "@nebutra/ui/patterns";
import type { ColumnDef } from "@tanstack/react-table";

interface Invoice {
  id: string;
  customer: string;
  status: string;
  amount: number;
}

const DATA: Invoice[] = [
  { id: "INV-1042", customer: "Northwind", status: "paid", amount: 1290 },
  { id: "INV-1043", customer: "Globex", status: "open", amount: 480 },
  { id: "INV-1044", customer: "Initech", status: "paid", amount: 2150 },
  { id: "INV-1045", customer: "Umbrella", status: "overdue", amount: 960 },
  { id: "INV-1046", customer: "Hooli", status: "open", amount: 310 },
];

const COLUMNS: ColumnDef<Invoice, unknown>[] = [
  { accessorKey: "id", header: "Invoice" },
  { accessorKey: "customer", header: "Customer" },
  { accessorKey: "status", header: "Status" },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `$${row.original.amount.toLocaleString("en-US")}`,
  },
];

export function DataTableDemo() {
  return (
    <div className="w-full p-6">
      <DataTable
        columns={COLUMNS}
        data={DATA}
        searchPlaceholder="Search invoices..."
        filterableColumns={[
          {
            id: "status",
            title: "Status",
            accessorKey: "status",
            options: [
              { label: "Paid", value: "paid" },
              { label: "Open", value: "open" },
              { label: "Overdue", value: "overdue" },
            ],
          },
        ]}
      />
    </div>
  );
}
