import { WordFadeIn } from "@nebutra/ui/primitives";

export default function WordFadeInDemo() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <WordFadeIn
        words="Take your time focusing on each word"
        delay={0.15}
        className="text-4xl font-bold text-center"
      />
    </div>
  );
}
