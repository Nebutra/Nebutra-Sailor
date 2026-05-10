import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedSpan, Terminal, TypingAnimation } from "./terminal";

const meta = {
  title: "Primitives/Terminal",
  component: Terminal,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "macOS-style terminal UI with sequenced typing animations. TypingAnimation types character by character; AnimatedSpan fades in instantly. Children execute in sequence by default.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Terminal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Terminal>
      <TypingAnimation>pnpm dlx shadcn@latest init</TypingAnimation>
      <AnimatedSpan className="text-green-400">✔ Preflight checks.</AnimatedSpan>
      <AnimatedSpan className="text-green-400">✔ Verifying framework.</AnimatedSpan>
      <AnimatedSpan className="text-green-400">✔ Validating Tailwind CSS.</AnimatedSpan>
      <TypingAnimation>Success! Project initialized.</TypingAnimation>
    </Terminal>
  ),
};

export const InstallSequence: Story = {
  render: () => (
    <Terminal>
      <TypingAnimation>pnpm add @nebutra/ui</TypingAnimation>
      <AnimatedSpan className="text-muted-foreground">Packages: +42</AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">
        Progress: ████████████████████ 100%
      </AnimatedSpan>
      <AnimatedSpan className="text-green-400">✔ Done in 3.2s</AnimatedSpan>
    </Terminal>
  ),
};

export const WithErrors: Story = {
  render: () => (
    <Terminal>
      <TypingAnimation>pnpm build</TypingAnimation>
      <AnimatedSpan className="text-muted-foreground">Building... </AnimatedSpan>
      <AnimatedSpan className="text-red-400">✘ Error: Module not found</AnimatedSpan>
      <AnimatedSpan className="text-red-400"> Cannot resolve '@/components/ui'</AnimatedSpan>
      <AnimatedSpan className="text-yellow-400">⚠ Fix: Check tsconfig paths</AnimatedSpan>
    </Terminal>
  ),
};

export const NoSequence: Story = {
  render: () => (
    <Terminal sequence={false}>
      <AnimatedSpan delay={0} className="text-muted-foreground">
        # Static terminal output
      </AnimatedSpan>
      <AnimatedSpan delay={300}>{">"} System ready</AnimatedSpan>
      <AnimatedSpan delay={600} className="text-green-400">
        ✔ All services running
      </AnimatedSpan>
    </Terminal>
  ),
};

export const GitCommit: Story = {
  render: () => (
    <Terminal>
      <TypingAnimation>git add .</TypingAnimation>
      <TypingAnimation>git commit -m "feat: add Globe component"</TypingAnimation>
      <AnimatedSpan className="text-muted-foreground">
        [main abc1234] feat: add Globe component
      </AnimatedSpan>
      <AnimatedSpan className="text-muted-foreground">
        {" "}
        3 files changed, 127 insertions(+)
      </AnimatedSpan>
      <TypingAnimation>git push origin main</TypingAnimation>
      <AnimatedSpan className="text-green-400">✔ Branch pushed to origin/main</AnimatedSpan>
    </Terminal>
  ),
};
