import { Clock, Pin as MapPin, Layers as Mountain } from "@nebutra/icons";
import { AnimatedHikeCard } from "@nebutra/ui/primitives";

const landscape = (sky: string, ridge: string, foreground: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="${sky}"/>
  <circle cx="640" cy="128" r="56" fill="#ffffff" opacity="0.72"/>
  <path d="M0 356 L128 224 L248 330 L372 184 L520 342 L640 244 L800 372 V600 H0 Z" fill="${ridge}"/>
  <path d="M0 430 C92 396 178 414 252 388 C362 350 476 402 566 374 C656 346 728 372 800 342 V600 H0 Z" fill="${foreground}"/>
  <path d="M104 500 C204 448 298 536 410 470 C512 410 610 498 720 438" fill="none" stroke="#ffffff" stroke-opacity="0.46" stroke-width="18" stroke-linecap="round"/>
</svg>
`)}`;

export function AnimatedHikeCardDemo() {
  return (
    <div className="flex w-full items-center justify-center p-8">
      <AnimatedHikeCard
        title="Yosemite Valley"
        images={[
          landscape("#e8f1f5", "#9fb3bf", "#627784"),
          landscape("#edf4ee", "#a5bda9", "#657b67"),
          landscape("#f4efe7", "#baa993", "#756b5f"),
        ]}
        stats={[
          { icon: <Clock className="size-4" />, label: "~6 Hours" },
          { icon: <Mountain className="size-4" />, label: "8 km" },
          { icon: <MapPin className="size-4" />, label: "California" },
        ]}
        description="Experience the breathtaking cliffs, spectacular waterfalls, and ancient sequoia trees in this unforgettable day hike."
        href="#"
      />
    </div>
  );
}
