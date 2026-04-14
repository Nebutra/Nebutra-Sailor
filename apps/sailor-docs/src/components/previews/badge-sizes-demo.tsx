import { Badge } from "@nebutra/ui/primitives";

export function BadgeSizesDemo() {
  return (
    <div className="gap-4 flex items-end">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  );
}
