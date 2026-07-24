import { TextShimmer } from "@nebutra/ui/primitives";

export default function TextShimmerDemo() {
  return (
    <div className="gap-8 bg-zinc-950 flex h-[300px] flex-col items-center justify-center">
      <div className="gap-4 flex flex-col items-center justify-center">
        <TextShimmer className="text-xl" duration={2}>
          Generating code...
        </TextShimmer>

        <TextShimmer
          as="h1"
          className="text-4xl font-bold [--base-color:theme(colors.blue.600)] [--base-gradient-color:theme(colors.blue.200)]"
          duration={3}
        >
          Premium Feature
        </TextShimmer>
      </div>
    </div>
  );
}
