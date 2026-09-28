"use client";

import { Clock, Pin as MapPin, Layers as Mountain } from "@nebutra/icons";
import { AnimatedHikeCard } from "@nebutra/ui/primitives";

export function AnimatedHikeCardDemo() {
  return (
    <div className="p-8 flex w-full items-center justify-center">
      <AnimatedHikeCard
        title="Yosemite Valley"
        images={[
          "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&q=80&w=400",
          "https://images.unsplash.com/photo-1755398104393-746e52af4a9f?auto=format&fit=crop&q=80&w=400",
          "https://images.unsplash.com/photo-1756764099214-b09a5666914b?auto=format&fit=crop&q=80&w=400",
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
