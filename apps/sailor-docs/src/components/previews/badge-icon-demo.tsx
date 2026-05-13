import { Check } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";

export function BadgeIconDemo() {
  return (
    <Badge variant="outline" icon={<Check />}>
      Completed
    </Badge>
  );
}
