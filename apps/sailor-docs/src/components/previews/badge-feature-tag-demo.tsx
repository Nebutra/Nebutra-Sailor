import { Sparkles } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";

export function BadgeFeatureTagDemo() {
  return (
    <div className="gap-2 flex items-center">
      <h3 className="text-lg font-medium">AI Generation</h3>
      <Badge variant="purple-subtle" icon={<Sparkles className="text-purple-500" />}>
        Beta
      </Badge>
    </div>
  );
}
