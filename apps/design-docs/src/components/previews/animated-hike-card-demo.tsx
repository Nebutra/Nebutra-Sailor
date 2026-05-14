import { Clock, Pin as MapPin, Layers as Mountain } from "@nebutra/icons";
import { AnimatedHikeCard } from "@nebutra/ui/primitives";

// Three brand-gradient variants for the stack (avoids network deps).
const gradient = (from: string, to: string, label: string): string =>
  `data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='${from}'/%3E%3Cstop offset='1' stop-color='${to}'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='600' fill='url(%23g)'/%3E%3Ctext x='400' y='320' text-anchor='middle' fill='white' font-size='48' font-weight='700' font-family='system-ui' opacity='0.9'%3E${label}%3C/text%3E%3C/svg%3E`;

export function AnimatedHikeCardDemo() {
  return (
    <div className="flex w-full items-center justify-center p-8">
      <AnimatedHikeCard
        title="Yosemite Valley"
        images={[
          gradient("%230033fe", "%230bf1c3", "Cliff"),
          gradient("%230bf1c3", "%238b5cf6", "Waterfall"),
          gradient("%238b5cf6", "%230033fe", "Sequoia"),
        ]}
        stats={[
          { icon: <Clock className="h-4 w-4" />, label: "~6 Hours" },
          { icon: <Mountain className="h-4 w-4" />, label: "8 km" },
          { icon: <MapPin className="h-4 w-4" />, label: "California" },
        ]}
        description="Experience the breathtaking cliffs, spectacular waterfalls, and ancient sequoia trees in this unforgettable day hike."
        href="#"
      />
    </div>
  );
}
