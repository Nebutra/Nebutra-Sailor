import { MagicCard } from "@nebutra/ui/primitives";
import { Layers, Sparkles, Zap } from "lucide-react";

export function MagicCardDemo() {
  return (
    <div className="md:grid-cols-3 gap-6 max-w-5xl p-4 md:p-8 mx-auto grid w-full grid-cols-1">
      <MagicCard className="p-8 h-64 flex cursor-pointer flex-col justify-between border">
        <div>
          <Sparkles className="h-8 w-8 text-blue-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Beautiful Design</h3>
          <p className="text-muted-foreground">
            Every component is crafted with attention to detail and modern aesthetics.
          </p>
        </div>
      </MagicCard>

      <MagicCard
        className="p-8 h-64 flex cursor-pointer flex-col justify-between border"
        gradientFrom="#f59e0b"
        gradientTo="#d31212"
        gradientColor="rgba(245, 158, 11, 0.15)"
      >
        <div>
          <Layers className="h-8 w-8 text-orange-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Highly Customizable</h3>
          <p className="text-muted-foreground">
            Modify colors, sizing, and animations to fit your exact brand needs.
          </p>
        </div>
      </MagicCard>

      <MagicCard
        className="p-8 h-64 flex cursor-pointer flex-col justify-between border"
        gradientFrom="#10b981"
        gradientTo="#3b82f6"
        gradientColor="rgba(16, 185, 129, 0.15)"
      >
        <div>
          <Zap className="h-8 w-8 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Unmatched Performance</h3>
          <p className="text-muted-foreground">
            Optimized for speed and minimal bundle sizes out of the box.
          </p>
        </div>
      </MagicCard>
    </div>
  );
}
