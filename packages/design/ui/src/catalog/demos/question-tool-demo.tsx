"use client";

import { QuestionPrompt } from "@nebutra/ui/primitives";

export function QuestionToolDemo() {
  return (
    <div className="w-full max-w-xl p-6">
      <QuestionPrompt
        questions={[
          {
            kind: "single",
            title: "Which environment should this deploy to?",
            options: [
              { id: "preview", label: "Preview", description: "A URL for this branch only" },
              { id: "production", label: "Production", description: "Replace what customers see" },
            ],
          },
        ]}
        onSubmit={() => {}}
      />
    </div>
  );
}
