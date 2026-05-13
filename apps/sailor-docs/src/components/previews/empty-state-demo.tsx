import { EmptyState } from "@nebutra/ui/layout";
import { Activity } from "lucide-react";

export function EmptyStateDemo() {
  return (
    <div className="max-w-md p-8 my-8 mx-auto w-full rounded-xl border bg-background">
      <EmptyState
        icon={<Activity size={20} />}
        title="Title"
        description="A message conveying the state of the product."
      />
    </div>
  );
}
