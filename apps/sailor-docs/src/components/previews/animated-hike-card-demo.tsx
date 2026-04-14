import { AnimatedHikeCard } from "@nebutra/ui/primitives";
import { Clock, MapPin, Mountain } from "lucide-react";

export function AnimatedHikeCardDemo() {
  return (
    <div className="p-8 flex w-full items-center justify-center">
      <AnimatedHikeCard
        title="Yosemite Valley"
        images={[
          "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&q=80&w=400",
          "https://images.unsplash.com/photo-1519681393774-d08959eb4a39?auto=format&fit=crop&q=80&w=400",
          "https://images.unsplash.com/photo-1444090542259-0af8afa965cb?auto=format&fit=crop&q=80&w=400",
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
