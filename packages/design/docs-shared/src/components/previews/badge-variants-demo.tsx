import { Badge } from "@nebutra/ui/primitives";

export function BadgeVariantsDemo() {
  return (
    <div className="gap-4 flex flex-wrap">
      <Badge variant="gray">gray</Badge>
      <Badge variant="blue">blue</Badge>
      <Badge variant="purple">purple</Badge>
      <Badge variant="amber">amber</Badge>
      <Badge variant="red">red</Badge>
      <Badge variant="pink">pink</Badge>
      <Badge variant="green">green</Badge>
      <Badge variant="teal">teal</Badge>
    </div>
  );
}
