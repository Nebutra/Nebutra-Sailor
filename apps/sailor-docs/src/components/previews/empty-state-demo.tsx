import { EmptyState } from "@nebutra/ui/primitives";
import { Activity } from "lucide-react";

export function EmptyStateDemo() {
  return (
    <div className="max-w-md p-8 my-8 mx-auto w-full rounded-xl border bg-background">
      <EmptyState.Root
        icon={<EmptyState.Icon icon={<Activity size={20} />} />}
        title="Title"
        description="A message conveying the state of the product."
      />
    </div>
  );
}
