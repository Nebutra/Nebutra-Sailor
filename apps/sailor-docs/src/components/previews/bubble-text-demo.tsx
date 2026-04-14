import { BubbleText } from "@nebutra/ui/primitives";

export default function BubbleTextDemo() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <BubbleText className="text-5xl font-bold text-foreground">Hover over me!</BubbleText>
    </div>
  );
}
