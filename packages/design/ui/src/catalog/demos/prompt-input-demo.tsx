"use client";

import { PromptInputBox } from "@nebutra/ui/components";

export function PromptInputDemo() {
  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="w-full md:w-[700px]">
        <PromptInputBox onSend={() => {}} />
      </div>
    </div>
  );
}
