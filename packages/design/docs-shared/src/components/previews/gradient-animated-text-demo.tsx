import { GradientAnimatedText } from "@nebutra/ui/primitives";

export default function GradientAnimatedTextDemo() {
  return (
    <div className="gap-4 bg-black/95 flex h-[300px] flex-col items-center justify-center">
      <div className="gap-2 text-5xl font-black flex">
        <GradientAnimatedText variant={1} theme="neon">
          Build.
        </GradientAnimatedText>
        <GradientAnimatedText variant={2} theme="neon">
          Ship.
        </GradientAnimatedText>
        <GradientAnimatedText variant={3} theme="neon">
          Scale.
        </GradientAnimatedText>
      </div>
    </div>
  );
}
