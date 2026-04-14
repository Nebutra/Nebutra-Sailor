"use client";

import { Input } from "@nebutra/ui/primitives";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function InputPasswordRevealDemo() {
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;

  return (
    <div className="relative w-full">
      <Input type={shown ? "text" : "password"} className="pr-9" placeholder="Password…" />
      <button
        type="button"
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={() => setShown((v) => !v)}
        className="right-2 h-5 w-5 rounded absolute top-1/2 flex -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
