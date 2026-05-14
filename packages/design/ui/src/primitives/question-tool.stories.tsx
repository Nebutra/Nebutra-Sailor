import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { type QuestionAnswer, type QuestionConfig, QuestionTool } from "./question-tool";

const meta: Meta<typeof QuestionTool> = {
  title: "Primitives/QuestionTool",
  component: QuestionTool,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Inline AI tool-call rendering of a multi-step questionnaire. Supports " +
          "single-select, multi-select, and free-text. Keyboard shortcuts: A/B/C/… " +
          "selects the matching option; Cmd/Ctrl+Enter submits a text question.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof QuestionTool>;

/* -------------------------------------------------------------------------- */
/*  Shared fixtures                                                           */
/* -------------------------------------------------------------------------- */

const singleQ: QuestionConfig = {
  kind: "single",
  title: "What's your primary role?",
  options: [
    { id: "frontend", label: "Frontend engineer", description: "(React, UI)" },
    { id: "backend", label: "Backend engineer", description: "(API, infra)" },
    { id: "design", label: "Designer", description: "(UI/UX)" },
    { id: "pm", label: "Product manager" },
  ],
  allowCustom: true,
  customPlaceholder: "Other role…",
};

const multiQ: QuestionConfig = {
  kind: "multi",
  title: "Which tools do you use daily?",
  description: "Pick all that apply (at least one).",
  options: [
    { id: "vscode", label: "VS Code" },
    { id: "linear", label: "Linear" },
    { id: "figma", label: "Figma" },
    { id: "vercel", label: "Vercel" },
    { id: "raycast", label: "Raycast" },
  ],
  minSelections: 1,
  maxSelections: 3,
  allowCustom: true,
};

const textQ: QuestionConfig = {
  kind: "text",
  title: "Anything else we should know?",
  placeholder: "Type your thoughts… (⌘+Enter to submit)",
};

const flow: QuestionConfig[] = [singleQ, multiQ, textQ];

/* -------------------------------------------------------------------------- */
/*  Stories                                                                   */
/* -------------------------------------------------------------------------- */

export const SingleSelect: Story = {
  name: "Single select",
  render: () => {
    const [answer, setAnswer] = useState<QuestionAnswer | undefined>(undefined);
    return (
      <div className="w-[480px] space-y-3">
        <QuestionTool
          questions={[singleQ]}
          onSubmitAnswer={(a) => setAnswer(a)}
          output={answer ? { answer } : undefined}
        />
        {answer && (
          <pre className="rounded-md bg-muted p-3 text-xs text-foreground">
            {JSON.stringify(answer, null, 2)}
          </pre>
        )}
      </div>
    );
  },
};

export const MultiSelect: Story = {
  name: "Multi select (min 1, max 3)",
  parameters: {
    docs: {
      description: {
        story:
          "Multi-select with min/max validation. Submit is disabled until at least 1 option " +
          "is picked; goes beyond 3 → disabled again.",
      },
    },
  },
  render: () => {
    const [answer, setAnswer] = useState<QuestionAnswer | undefined>(undefined);
    return (
      <div className="w-[480px] space-y-3">
        <QuestionTool
          questions={[multiQ]}
          onSubmitAnswer={(a) => setAnswer(a)}
          output={answer ? { answer } : undefined}
        />
        {answer && (
          <pre className="rounded-md bg-muted p-3 text-xs text-foreground">
            {JSON.stringify(answer, null, 2)}
          </pre>
        )}
      </div>
    );
  },
};

export const FreeText: Story = {
  name: "Free text",
  render: () => {
    const [answer, setAnswer] = useState<QuestionAnswer | undefined>(undefined);
    return (
      <div className="w-[480px] space-y-3">
        <QuestionTool
          questions={[textQ]}
          onSubmitAnswer={(a) => setAnswer(a)}
          output={answer ? { answer } : undefined}
        />
        {answer && (
          <pre className="rounded-md bg-muted p-3 text-xs text-foreground">
            {JSON.stringify(answer, null, 2)}
          </pre>
        )}
      </div>
    );
  },
};

export const MultiStepFlow: Story = {
  name: "Multi-step flow (3 questions)",
  parameters: {
    docs: {
      description: {
        story:
          "Three questions in sequence. After each submission the index advances; after the " +
          "last, the tool collapses to summary state showing labels (not raw ids).",
      },
    },
  },
  render: () => {
    const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({});
    return (
      <div className="w-[480px] space-y-3">
        <QuestionTool
          questions={flow}
          toolCallId="demo-flow"
          onSubmitAnswer={(a, idx) => setAnswers((prev) => ({ ...prev, [idx]: a }))}
        />
        {Object.keys(answers).length > 0 && (
          <pre className="rounded-md bg-muted p-3 text-xs text-foreground">
            {JSON.stringify(answers, null, 2)}
          </pre>
        )}
      </div>
    );
  },
};

export const ControlledIndex: Story = {
  name: "Controlled question index",
  parameters: {
    docs: {
      description: {
        story:
          "Parent owns the index. Useful when the AI flow drives navigation server-side " +
          "(e.g., next question selected by a model based on prior answer).",
      },
    },
  },
  render: () => {
    const [idx, setIdx] = useState(1);
    const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({});
    return (
      <div className="w-[480px] space-y-3">
        <QuestionTool
          questions={flow}
          questionIndex={idx}
          onPreviousQuestion={() => setIdx((p) => Math.max(1, p - 1))}
          onNextQuestion={() => setIdx((p) => Math.min(flow.length, p + 1))}
          onSubmitAnswer={(a, qIdx) => setAnswers((prev) => ({ ...prev, [qIdx]: a }))}
        />
        <div className="text-xs text-muted-foreground">
          Parent state: idx={idx}, answered={Object.keys(answers).length}
        </div>
      </div>
    );
  },
};

export const KeyboardShortcuts: Story = {
  name: "Keyboard (A/B/C/… + Cmd+Enter)",
  parameters: {
    docs: {
      description: {
        story:
          "Press letter keys A–E to select options. The badge letters announce this affordance. " +
          "Letters are ignored when an input/textarea is focused so typing remains unblocked.",
      },
    },
  },
  render: () => {
    const [answer, setAnswer] = useState<QuestionAnswer | undefined>(undefined);
    return (
      <div className="w-[480px] space-y-3">
        <p className="text-xs text-muted-foreground">
          Click outside, then press <kbd className="rounded bg-accent px-1">A</kbd>—
          <kbd className="rounded bg-accent px-1">E</kbd> to select an option.
        </p>
        <QuestionTool
          questions={[multiQ]}
          onSubmitAnswer={(a) => setAnswer(a)}
          output={answer ? { answer } : undefined}
        />
      </div>
    );
  },
};

export const I18N: Story = {
  name: "i18n labels",
  render: () => {
    const [answer, setAnswer] = useState<QuestionAnswer | undefined>(undefined);
    const cnQuestion: QuestionConfig = {
      kind: "single",
      title: "你的主要岗位是什么？",
      options: [
        { id: "frontend", label: "前端工程师", description: "(React / UI)" },
        { id: "backend", label: "后端工程师", description: "(API / 基础设施)" },
        { id: "design", label: "设计师" },
        { id: "pm", label: "产品经理" },
      ],
      allowCustom: true,
      customPlaceholder: "其他岗位…",
    };
    return (
      <div className="w-[480px]">
        <QuestionTool
          headerLabel="问题"
          submitLabel="发送"
          nextLabel="下一题"
          skipLabel="跳过"
          previousLabel="上一题"
          questions={[cnQuestion]}
          onSubmitAnswer={(a) => setAnswer(a)}
          output={answer ? { answer } : undefined}
        />
      </div>
    );
  },
};
