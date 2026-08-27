import { Stack } from "@nebutra/ui/primitives";

export function StackDemo() {
  return (
    <Stack gap={4} className="max-w-sm p-6 w-full rounded-xl border bg-background shadow-sm">
      <div className="h-8 w-3/4 rounded-md bg-primary/20" />
      <div className="h-4 w-full rounded-md bg-muted" />
      <div className="h-4 w-5/6 rounded-md bg-muted" />
      <div className="mt-2 h-10 w-full rounded-md bg-primary" />
    </Stack>
  );
}
