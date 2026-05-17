"use client";

import dynamic from "next/dynamic";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";

const CommandPalette = dynamic(
  () =>
    import("@/components/command-palette/command-palette").then((module) => module.CommandPalette),
  {
    loading: () => null,
    ssr: false,
  },
);

export function LazyCommandPalette() {
  const { open } = useCommandPalette();
  return open ? <CommandPalette /> : null;
}
