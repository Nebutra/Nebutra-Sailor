"use client";

import { Feedback } from "@nebutra/ui/primitives";

export function FeedbackDemo() {
  return (
    <div className="h-40 px-4 py-8 flex w-full items-center justify-center">
      <Feedback label="my-app" onSubmit={async (_payload) => {}} />
    </div>
  );
}
