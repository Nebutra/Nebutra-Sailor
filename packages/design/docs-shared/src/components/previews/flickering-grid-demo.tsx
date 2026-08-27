import { FlickeringGrid } from "@nebutra/ui/primitives";

export function FlickeringGridDemo() {
  return (
    <div className="max-w-3xl bg-slate-950 relative h-[400px] w-full overflow-hidden rounded-xl border">
      <FlickeringGrid
        className="inset-0 absolute z-0"
        squareSize={4}
        gridGap={6}
        color="#60A5FA"
        maxOpacity={0.5}
        flickerChance={0.1}
      />
      <div className="pointer-events-none relative z-10 flex h-full items-center justify-center">
        <h2 className="text-4xl font-bold text-white tracking-tight">Flickering Grid</h2>
      </div>
    </div>
  );
}
