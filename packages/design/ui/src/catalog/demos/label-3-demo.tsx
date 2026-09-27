"use client";

import { Label, Textarea } from "@nebutra/ui/primitives";
export function Label3Demo() {
  return (
    <div className="space-y-1 max-w-sm w-full">
      <Label htmlFor="bio">Bio</Label>
      <p id="bio-hint" className="text-xs mb-2 text-muted-foreground">
        Tell us a bit about yourself. Max 200 characters.
      </p>
      <Textarea id="bio" aria-describedby="bio-hint" maxLength={200} />
    </div>
  );
}
