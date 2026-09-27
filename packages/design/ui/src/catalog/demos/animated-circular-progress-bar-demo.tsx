"use client";

import { AnimatedCircularProgressBar } from "@nebutra/ui/primitives";
import { useEffect, useState } from "react";

export function AnimatedCircularProgressBarDemo() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const handleIncrement = (prev: number) => {
      if (prev === 100) {
        return 0;
      }
      return prev + 10;
    };
    setValue(handleIncrement);
    const interval = setInterval(() => setValue(handleIncrement), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatedCircularProgressBar
      max={100}
      min={0}
      value={value}
      gaugePrimaryColor="hsl(var(--primary))"
    />
  );
}
