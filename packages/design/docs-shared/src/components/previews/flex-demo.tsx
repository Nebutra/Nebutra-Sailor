import { Flex } from "@nebutra/ui/primitives";

export function FlexDemo() {
  return (
    <Flex
      gap={4}
      align="center"
      justify="center"
      className="max-w-sm p-6 w-full rounded-xl border bg-background/50 shadow-sm"
    >
      <div className="h-16 w-16 rounded-lg border border-primary/30 bg-primary/20" />
      <div className="h-16 w-24 font-medium flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        Flex
      </div>
      <div className="h-16 w-16 rounded-lg border border-primary/30 bg-primary/20" />
    </Flex>
  );
}
