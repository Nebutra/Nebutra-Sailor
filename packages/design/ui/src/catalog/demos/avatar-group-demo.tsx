"use client";

import { AvatarGroup } from "@nebutra/ui/primitives";

const gh = (u: string) => `https://avatars.githubusercontent.com/${u}?s=64`;

const GROUP_SM = [
  { src: gh("evilrabbit"), alt: "evilrabbit", fallback: "ER" },
  { src: gh("leerob"), alt: "leerob", fallback: "LR" },
  { src: gh("rauchg"), alt: "rauchg", fallback: "RG" },
];

const GROUP_LG = [
  { src: gh("sambecker"), alt: "sambecker", fallback: "SB" },
  { src: gh("rauno"), alt: "rauno", fallback: "RA" },
  { src: gh("shuding"), alt: "shuding", fallback: "SH" },
  { src: gh("skllcrn"), alt: "skllcrn", fallback: "SK" },
  { src: gh("almonk"), alt: "almonk", fallback: "AL" },
];

/** Two rows: default limit and with overflow +N */
export function AvatarGroupDemo() {
  return (
    <div className="gap-4 flex flex-col">
      {/* 3 members, all visible */}
      <AvatarGroup items={GROUP_SM} max={4} size="sm" />
      {/* 5 members, max=4 → shows +2 */}
      <AvatarGroup items={GROUP_LG} max={4} size="sm" />
    </div>
  );
}
