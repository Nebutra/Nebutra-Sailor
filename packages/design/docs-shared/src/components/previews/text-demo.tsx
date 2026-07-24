import { Text } from "@nebutra/ui/primitives";

export function TextDemo() {
  return (
    <div className="gap-4 flex flex-col">
      <Text variant="body">Body text — default paragraph style</Text>
      <Text variant="body-sm">Small body — captions and secondary content</Text>
      <Text variant="label" color="muted">
        Label — form labels and metadata
      </Text>
    </div>
  );
}
