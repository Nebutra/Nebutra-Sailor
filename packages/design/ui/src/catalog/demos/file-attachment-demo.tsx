"use client";

import { FileAttachment } from "@nebutra/ui/primitives";

export function FileAttachmentDemo() {
  return (
    <div className="flex flex-wrap gap-3 p-6">
      <FileAttachment filename="q3-board-deck.pdf" size={2_480_000} onRemove={() => {}} />
      <FileAttachment filename="churn-by-cohort.csv" size={184_000} onRemove={() => {}} />
    </div>
  );
}
