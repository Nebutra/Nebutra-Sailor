"use client";

import { ConsentCard } from "@nebutra/ui/patterns";
import { useState } from "react";

export function ConsentCardDemo() {
  const [answer, setAnswer] = useState<string | null>(null);

  return (
    <div className="relative flex h-[320px] w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/30 text-sm text-muted-foreground">
      {answer ? `You chose: ${answer}` : "The page stays readable behind the question."}
      {answer ? null : (
        <ConsentCard
          className="absolute"
          decline={{ label: "Essential only", onClick: () => setAnswer("essential only") }}
          accept={{ label: "Accept analytics", onClick: () => setAnswer("analytics") }}
        >
          We use essential cookies to run the site, and optional analytics to improve it.{" "}
          <a href="#cookies">Cookie policy</a>
        </ConsentCard>
      )}
    </div>
  );
}
