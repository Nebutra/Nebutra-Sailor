"use client";

import { Avatar, AvatarFallback, AvatarImage, MessageWithReactions } from "@nebutra/ui/primitives";

export function ReactionChipDemo() {
  return (
    <div className="gap-6 p-8 flex min-h-[400px] w-full flex-col items-center justify-center bg-muted/20">
      <div className="gap-4 max-w-md flex w-full items-start">
        <Avatar className="mt-1">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <div className="gap-1 flex w-full flex-col">
          <div className="gap-2 flex items-baseline">
            <span className="font-semibold text-sm">Designer Bob</span>
            <span className="text-xs text-muted-foreground">11:34 AM</span>
          </div>
          <MessageWithReactions
            text="I just updated the Figma file with the new hero section designs. Everyone, please take a look!"
            reactionOptions={["👀", "🔥", "🙌", "❤️", "👍"]}
          />
        </div>
      </div>
    </div>
  );
}
