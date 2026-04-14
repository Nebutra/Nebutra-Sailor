import { CardSpotlight } from "@nebutra/ui/primitives";
import { ShieldAlert } from "lucide-react";

export function CardSpotlightDemo() {
  return (
    <div className="p-8 flex w-full items-center justify-center">
      <CardSpotlight className="h-96 w-96 flex flex-col items-center justify-center text-center">
        <ShieldAlert className="h-16 w-16 text-white mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">High Security</h2>
        <p className="text-neutral-300">
          We use state-of-the-art encryption protocols to keep your data safe and private. Hover to
          discover more.
        </p>
      </CardSpotlight>
    </div>
  );
}
