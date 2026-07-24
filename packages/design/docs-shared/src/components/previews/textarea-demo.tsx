"use client";

import { Textarea } from "@nebutra/ui/primitives";

export function TextareaDemo() {
  return (
    <Textarea id="message" label="Message" placeholder="Write your message here..." rows={4} />
  );
}
