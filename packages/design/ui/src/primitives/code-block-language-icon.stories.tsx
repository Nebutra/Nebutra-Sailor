import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlockLanguageIcon } from "./code-block-language-icon";

const languages = [
  "typescript",
  "tsx",
  "javascript",
  "python",
  "rust",
  "go",
  "bash",
  "json",
  "yaml",
  "markdown",
  "html",
  "css",
];

const meta = {
  title: "Primitives/CodeBlockLanguageIcon",
  component: CodeBlockLanguageIcon,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Resolves a language name, alias or file extension to its brand icon. Unknown languages render the `fallback`, or nothing.",
      },
    },
  },
  tags: ["autodocs"],
  args: { language: "typescript", className: "size-6" },
} satisfies Meta<typeof CodeBlockLanguageIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Gallery: Story = {
  render: (args) => (
    <ul className="grid grid-cols-4 gap-x-8 gap-y-4">
      {languages.map((language) => (
        <li key={language} className="flex items-center gap-2 text-sm text-foreground">
          <CodeBlockLanguageIcon {...args} language={language} />
          <span className="font-mono text-xs text-muted-foreground">{language}</span>
        </li>
      ))}
    </ul>
  ),
};

export const Aliases: Story = {
  name: "Aliases and file names",
  render: (args) => (
    <ul className="flex flex-col gap-3">
      {["ts", "language-py", "main.rs", "Dockerfile"].map((language) => (
        <li key={language} className="flex items-center gap-2 text-sm">
          <CodeBlockLanguageIcon
            {...args}
            language={language}
            fallback={<span className="inline-block size-6 rounded-sm border border-dashed" />}
          />
          <span className="font-mono text-xs text-muted-foreground">{language}</span>
        </li>
      ))}
    </ul>
  ),
};

export const Fallback: Story = {
  args: {
    language: "unknown-lang",
    fallback: <span className="font-mono text-xs text-muted-foreground">{"</>"}</span>,
  },
};
