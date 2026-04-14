import { Badge } from "@nebutra/ui/primitives";
import { Check } from "lucide-react";

export function BadgeIconDemo() {
  return (
    <Badge variant="outline" icon={<Check />}>
      Completed
    </Badge>
  );
}
