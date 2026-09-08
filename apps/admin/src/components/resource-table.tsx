import type { AdminManifest, AdminResource } from "@nebutra/contracts/admin";
import { cn } from "@nebutra/ui/utils";
import { type ContractCaller, ContractError, listResource } from "@/lib/contract-client";
import { cellText, relativeTime, statusTone } from "@/lib/format";
import { Pill, StatusDot, StatusPill } from "./status-dot";

/**
 * Generic renderer for one manifest resource. Columns come from the
 * manifest; the only thing this component knows is how to draw a `kind`.
 */
type Row = Record<string, unknown>;

function Cell({
  column,
  row,
  now,
}: {
  column: AdminResource["columns"][number];
  row: Row;
  now: number;
}) {
  const value = row[column.key];
  const text = cellText(column, value, now);
  switch (column.kind) {
    case "status": {
      const tone = statusTone(value);
      return (
        <span className="inline-flex items-center gap-2">
          <StatusDot tone={tone} />
          <span>{text}</span>
        </span>
      );
    }
    case "badge":
      return text === "—" ? (
        <span className="text-muted-foreground">—</span>
      ) : statusTone(value) === "unknown" ? (
        <Pill>{text}</Pill>
      ) : (
        <StatusPill value={text} />
      );
    case "mono":
      return <span className="font-mono text-xs">{text}</span>;
    case "number":
      return <span className="tabular-nums">{text}</span>;
    case "time":
      return (
        <span className="text-muted-foreground" title={typeof value === "string" ? value : ""}>
          {text}
        </span>
      );
    case "link":
      return typeof value === "string" && value.startsWith("http") ? (
        <a
          href={value}
          className="underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {text}
        </a>
      ) : (
        <span>{text}</span>
      );
    default:
      return <span>{text}</span>;
  }
}

export async function ResourceTable({
  manifest,
  resource,
  caller,
}: {
  manifest: AdminManifest;
  resource: AdminResource;
  caller: ContractCaller;
}) {
  const now = Date.now();
  let items: Row[] = [];
  let probedAt: string | undefined;
  let total = 0;
  let error: { code: string; message: string } | null = null;
  try {
    const list = await listResource(manifest, resource.list, caller);
    items = list.items;
    total = list.total;
    probedAt = list.probedAt;
  } catch (e) {
    error =
      e instanceof ContractError
        ? { code: e.code, message: e.message }
        : { code: "internal", message: e instanceof Error ? e.message : "failed" };
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-9 items-center justify-between gap-3 border-border border-b bg-muted/40 px-3 text-muted-foreground text-xs">
        <span>{error ? "list failed" : `${items.length} of ${total}`}</span>
        {probedAt ? <span>probed {relativeTime(probedAt, now)}</span> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              {resource.columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "h-9 whitespace-nowrap border-border border-b bg-muted/40 px-3 text-left font-medium text-muted-foreground text-xs leading-4",
                    column.align === "end" && "text-right",
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td
                  colSpan={resource.columns.length}
                  className="h-11 px-3 text-[hsl(var(--destructive-strong))] text-xs"
                >
                  <span className="font-mono">{error.code}</span> · {error.message}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={resource.columns.length}
                  className="h-11 px-3 text-muted-foreground text-xs"
                >
                  {resource.label}: nothing listed.
                </td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr
                  key={String(row[resource.key] ?? index)}
                  className="border-border border-b last:border-b-0 hover:bg-muted/40"
                >
                  {resource.columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "h-11 overflow-hidden text-ellipsis whitespace-nowrap px-3 align-middle leading-5",
                        column.align === "end" && "text-right",
                      )}
                    >
                      <Cell column={column} row={row} now={now} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
