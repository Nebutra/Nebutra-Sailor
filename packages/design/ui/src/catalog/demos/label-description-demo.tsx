"use client";

import { Label, Textarea } from "@nebutra/ui/primitives";

export function LabelDescriptionDemo() {
  return (
    <div className="space-y-1 max-w-sm w-full">
      <Label htmlFor="bio">个人简介 (Bio)</Label>
      <p id="bio-hint" className="text-xs mb-2 text-muted-foreground">
        请简要介绍一下您自己。最多 200 个字符。 (Tell us a bit about yourself. Max 200 characters.)
      </p>
      <Textarea id="bio" aria-describedby="bio-hint" maxLength={200} />
    </div>
  );
}
