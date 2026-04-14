import { Globe } from "@nebutra/ui/primitives";

export function GlobeDemo() {
  return (
    <div className="p-8 flex w-full items-center justify-center">
      <div className="relative h-[360px] w-[360px]">
        <Globe
          config={{
            markers: [
              { location: [40.7128, -74.006], size: 0.1 },
              { location: [51.5074, -0.1278], size: 0.08 },
              { location: [35.6762, 139.6503], size: 0.08 },
              { location: [48.8566, 2.3522], size: 0.07 },
            ],
            markerColor: [0.1, 0.8, 1],
            baseColor: [0.3, 0.3, 0.3],
            glowColor: [0.2, 0.4, 1],
            dark: 1,
          }}
        />
      </div>
    </div>
  );
}
