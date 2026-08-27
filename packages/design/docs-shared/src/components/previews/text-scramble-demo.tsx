import { TextScramble } from "@nebutra/ui/primitives";
import { useState } from "react";

export default function TextScrambleDemo() {
  const [trigger, setTrigger] = useState(false);

  return (
    <div className="flex h-[300px] items-center justify-center">
      <TextScramble
        as="span"
        trigger={trigger}
        onScrambleComplete={() => setTrigger(false)}
        onHoverStart={() => setTrigger(true)}
        className="text-2xl cursor-pointer font-mono"
      >
        Hover over me to scramble
      </TextScramble>
    </div>
  );
}
