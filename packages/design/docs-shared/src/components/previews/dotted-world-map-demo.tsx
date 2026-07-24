import { DottedWorldMap } from "@nebutra/ui/primitives";

export function DottedWorldMapDemo() {
  return (
    <div className="max-w-4xl p-4 gap-8 mx-auto flex min-h-[400px] w-full flex-col items-center justify-center">
      <div className="p-8 relative flex h-auto w-full items-center justify-center overflow-hidden rounded-xl border bg-background">
        <div className="top-4 left-4 text-sm font-medium px-3 py-1.5 gap-2 backdrop-blur absolute z-10 flex items-center rounded-full border bg-background/80 shadow-sm">
          Global Reach
        </div>

        <DottedWorldMap
          className="max-wfull opacity-70"
          dotColor="currentColor"
          dotRadius={0.2}
          backgroundColor="transparent"
        />

        {/* Subtle decorative elements over the map */}
        <div className="size-4 bg-blue-500 blur-xl animate-pulse absolute top-1/2 left-[25%] rounded-full opacity-50"></div>
        <div className="size-6 bg-purple-500 blur-xl animate-pulse absolute top-[40%] right-[30%] rounded-full opacity-50 delay-1000"></div>
        <div className="size-3 bg-green-500 blur-xl animate-pulse absolute bottom-[30%] left-[60%] rounded-full opacity-50 delay-500"></div>
      </div>
    </div>
  );
}
