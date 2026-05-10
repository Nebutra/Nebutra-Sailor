import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "./code-block";

const meta = {
  title: "Primitives/CodeBlock",
  component: CodeBlock,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Multi-file tabbed code viewer with syntax highlighting, copy-to-clipboard, and auto-language detection.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    showLineNumbers: { control: "boolean" },
    maxHeight: { control: "text" },
    enableLineReferences: { control: "boolean" },
    showLanguageSwitcher: { control: "boolean" },
  },
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

const tsCode = `import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`;

const cssCode = `:root {
  --primary: #7C3AED;
  --primary-foreground: #ffffff;
  --radius: 0.5rem;
}

.button {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: var(--radius);
  padding: 0.5rem 1rem;
}`;

const jsonCode = `{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}`;

export const SingleFile: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock files={[{ title: "counter.tsx", code: tsCode }]} />
    </div>
  ),
};

export const MultipleFiles: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock
        files={[
          { title: "counter.tsx", code: tsCode },
          { title: "styles.css", code: cssCode },
          { title: "package.json", code: jsonCode },
        ]}
        defaultTitle="counter.tsx"
      />
    </div>
  ),
};

export const WithLineNumbers: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock files={[{ title: "counter.tsx", code: tsCode }]} showLineNumbers />
    </div>
  ),
};

export const CustomHeight: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock files={[{ title: "counter.tsx", code: tsCode }]} maxHeight={200} />
    </div>
  ),
};

export const JsonOnly: Story = {
  render: () => (
    <div className="w-[500px]">
      <CodeBlock files={[{ title: "package.json", code: jsonCode }]} showLineNumbers />
    </div>
  ),
};

// =============================================================================
// Geist-aligned features
// =============================================================================

export const HighlightedLines: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock
        files={[
          {
            title: "counter.tsx",
            code: tsCode,
            highlightedLines: [3, 4, 5],
          },
        ]}
        showLineNumbers
      />
    </div>
  ),
};

const diffCode = `import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  return (
    <div>
      <p>Count: {count}</p>
      <p>Step: {step}</p>
      <button onClick={() => setCount(count + step)}>
        Increment by {step}
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
    </div>
  );
}`;

export const DiffLines: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock
        files={[
          {
            title: "counter.tsx",
            code: diffCode,
            addedLines: [5, 9, 10, 11, 13, 14],
            removedLines: [4],
          },
        ]}
        showLineNumbers
      />
    </div>
  ),
};

export const HighlightedWithDiff: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock
        files={[
          {
            title: "counter.tsx",
            code: diffCode,
            highlightedLines: [1, 2],
            addedLines: [5, 9],
            removedLines: [4],
          },
        ]}
        showLineNumbers
      />
    </div>
  ),
};

export const ReferencedLines: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock
        files={[{ title: "counter.tsx", code: tsCode }]}
        showLineNumbers
        enableLineReferences
      />
    </div>
  ),
};

export const WithLanguageSwitcher: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock
        files={[{ title: "example.txt", code: tsCode }]}
        showLineNumbers
        showLanguageSwitcher
      />
    </div>
  ),
};

export const AllFeatures: Story = {
  render: () => (
    <div className="w-[600px]">
      <CodeBlock
        files={[
          {
            title: "counter.tsx",
            code: diffCode,
            highlightedLines: [1, 2, 3],
            addedLines: [5, 9],
            removedLines: [4],
          },
          { title: "styles.css", code: cssCode },
        ]}
        showLineNumbers
        enableLineReferences
        showLanguageSwitcher
      />
    </div>
  ),
};
