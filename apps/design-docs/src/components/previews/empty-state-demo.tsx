import { ChartBarPeak } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/primitives";

export function EmptyStateDemo() {
  return (
    <div className="max-w-md p-8 my-8 mx-auto w-full rounded-xl border bg-background">
      <EmptyState.Root
        icon={<EmptyState.Icon icon={<ChartBarPeak size={32} />} />}
        title="Title"
        description="A message conveying the state of the product."
      />
    </div>
  );
}
