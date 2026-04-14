import { ColorBadge } from "@nebutra/ui/primitives";
import { AlertTriangle, CheckCircle2, Info, Shield, XCircle, Zap } from "lucide-react";

export function ColorBadgeDemo() {
  return (
    <div className="gap-8 max-w-2xl p-6 mx-auto flex min-h-[400px] w-full flex-col items-center justify-center">
      <div className="gap-4 flex flex-col items-center">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Standard Variants</h3>
        <div className="gap-3 flex flex-wrap items-center justify-center">
          <ColorBadge variant="gray">Draft</ColorBadge>
          <ColorBadge variant="blue">In Progress</ColorBadge>
          <ColorBadge variant="purple">Review</ColorBadge>
          <ColorBadge variant="amber">Pending</ColorBadge>
          <ColorBadge variant="green">Shipped</ColorBadge>
          <ColorBadge variant="red">Failed</ColorBadge>
          <ColorBadge variant="pink">Marketing</ColorBadge>
          <ColorBadge variant="teal">Engineering</ColorBadge>
        </div>
      </div>

      <div className="gap-4 flex flex-col items-center">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Subtle Variants</h3>
        <div className="gap-3 flex flex-wrap items-center justify-center">
          <ColorBadge variant="gray-subtle">Archived</ColorBadge>
          <ColorBadge variant="blue-subtle">Info</ColorBadge>
          <ColorBadge variant="purple-subtle">Design</ColorBadge>
          <ColorBadge variant="amber-subtle">Warning</ColorBadge>
          <ColorBadge variant="green-subtle">Success</ColorBadge>
          <ColorBadge variant="red-subtle">Error</ColorBadge>
          <ColorBadge variant="pink-subtle">Brand</ColorBadge>
          <ColorBadge variant="teal-subtle">Data</ColorBadge>
        </div>
      </div>

      <div className="gap-4 flex flex-col items-center">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">
          With Icons & Special Variants
        </h3>
        <div className="gap-3 flex flex-wrap items-center justify-center">
          <ColorBadge variant="green" icon={<CheckCircle2 />}>
            Healthy
          </ColorBadge>
          <ColorBadge variant="amber-subtle" icon={<AlertTriangle />}>
            Degraded
          </ColorBadge>
          <ColorBadge variant="red" icon={<XCircle />}>
            Outage
          </ColorBadge>
          <ColorBadge variant="blue-subtle" icon={<Info />}>
            Maintenance
          </ColorBadge>
          <ColorBadge variant="purple" icon={<Shield />}>
            Protected
          </ColorBadge>
          <ColorBadge variant="turbo" icon={<Zap />}>
            v2.0 Beta
          </ColorBadge>
          <ColorBadge variant="trial">14 days left</ColorBadge>
        </div>
      </div>

      <div className="gap-4 flex flex-col items-center">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Sizes</h3>
        <div className="gap-4 flex items-center justify-center">
          <ColorBadge variant="blue" size="sm">
            Small
          </ColorBadge>
          <ColorBadge variant="blue" size="md">
            Medium
          </ColorBadge>
          <ColorBadge variant="blue" size="lg">
            Large
          </ColorBadge>
        </div>
      </div>
    </div>
  );
}
