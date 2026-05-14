import { Badge } from "@nebutra/ui/primitives";

export function BadgeTableDemo() {
  return (
    <table className="text-sm">
      <thead className="text-xs uppercase tracking-wider text-muted-foreground">
        <tr>
          <th className="px-3 py-2 text-left font-medium">Invoice</th>
          <th className="px-3 py-2 text-left font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="text-foreground">
        <tr className="border-t border-border">
          <td className="px-3 py-2 font-mono text-xs">INV-2026-001</td>
          <td className="px-3 py-2 align-middle">
            <Badge variant="success" dot>
              Paid
            </Badge>
          </td>
        </tr>
        <tr className="border-t border-border">
          <td className="px-3 py-2 font-mono text-xs">INV-2026-002</td>
          <td className="px-3 py-2 align-middle">
            <Badge variant="warning" dot>
              Pending
            </Badge>
          </td>
        </tr>
        <tr className="border-t border-border">
          <td className="px-3 py-2 font-mono text-xs">INV-2026-003</td>
          <td className="px-3 py-2 align-middle">
            <Badge variant="destructive" dot>
              Overdue
            </Badge>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
