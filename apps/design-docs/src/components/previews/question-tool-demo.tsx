"use client";

import { type QuestionAnswer, type QuestionConfig, QuestionTool } from "@nebutra/ui/primitives";
import { useState } from "react";

const questions: QuestionConfig[] = [
  {
    kind: "single",
    title: "What's your primary role?",
    options: [
      { id: "frontend", label: "Frontend engineer", description: "(React, UI)" },
      { id: "backend", label: "Backend engineer", description: "(API, infra)" },
      { id: "design", label: "Designer" },
      { id: "pm", label: "Product manager" },
    ],
    allowCustom: true,
    customPlaceholder: "Other role…",
  },
  {
    kind: "multi",
    title: "Which tools do you use daily?",
    description: "Pick all that apply.",
    options: [
      { id: "vscode", label: "VS Code" },
      { id: "linear", label: "Linear" },
      { id: "figma", label: "Figma" },
      { id: "vercel", label: "Vercel" },
      { id: "raycast", label: "Raycast" },
    ],
    minSelections: 1,
    maxSelections: 3,
  },
  {
    kind: "text",
    title: "Anything else we should know?",
    placeholder: "Type your thoughts… (⌘+Enter to submit)",
  },
];

export function QuestionToolDemo() {
  const [_answers, setAnswers] = useState<Record<number, QuestionAnswer>>({});
  return (
    <div className="w-full max-w-[480px]">
      <QuestionTool
        questions={questions}
        toolCallId="docs-demo"
        onSubmitAnswer={(answer, idx) => setAnswers((prev) => ({ ...prev, [idx]: answer }))}
      />
    </div>
  );
}
