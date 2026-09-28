"use client";

import { DiceBearAvatar } from "@nebutra/ui/primitives";

/** Deterministic generated avatars — same seed always yields same avatar */
export function AvatarDicebearDemo() {
  return (
    <div className="gap-6 flex flex-wrap">
      <div className="gap-2 flex flex-col items-center">
        <DiceBearAvatar seed="rauchg" avatarStyle="bottts-neutral" size="md" />
        <span className="text-[11px] text-muted-foreground">bottts-neutral</span>
      </div>
      <div className="gap-2 flex flex-col items-center">
        <DiceBearAvatar seed="leerob" avatarStyle="pixel-art" options={{ radius: 50 }} size="md" />
        <span className="text-[11px] text-muted-foreground">pixel-art</span>
      </div>
      <div className="gap-2 flex flex-col items-center">
        <DiceBearAvatar seed="guest-123" avatarStyle="fun-emoji" size="md" />
        <span className="text-[11px] text-muted-foreground">fun-emoji</span>
      </div>
      <div className="gap-2 flex flex-col items-center">
        <DiceBearAvatar seed="my-bot" avatarStyle="bottts" size="md" />
        <span className="text-[11px] text-muted-foreground">bottts</span>
      </div>
    </div>
  );
}
