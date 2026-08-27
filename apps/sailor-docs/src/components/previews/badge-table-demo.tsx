import { Badge } from "@nebutra/ui/primitives";

export function BadgeTableDemo() {
  return (
    <table>
      <tbody>
        <tr>
          <td>Status</td>
          <td>
            <Badge variant="success" dot>
              Paid
            </Badge>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
