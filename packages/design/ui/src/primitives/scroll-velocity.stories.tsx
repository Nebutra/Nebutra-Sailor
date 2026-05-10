import type { Meta, StoryObj } from "@storybook/react";
import { ScrollVelocityContainer, ScrollVelocityRow } from "./scroll-velocity";

const meta = {
  title: "Primitives/ScrollVelocity",
  component: ScrollVelocityContainer,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Scroll-speed driven horizontal content marquee. Speed increases as you scroll. Use ScrollVelocityContainer to sync velocity across multiple rows.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScrollVelocityContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const logoItem = (text: string) => (
  <span className="mx-8 text-2xl font-bold text-muted-foreground">{text}</span>
);

export const Default: Story = {
  render: () => (
    <div className="h-[300px] overflow-y-scroll">
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        ↕ Scroll to see velocity effect
      </div>
      <ScrollVelocityContainer className="py-8 text-3xl font-bold">
        <ScrollVelocityRow baseVelocity={5}>
          {logoItem("Nebutra")}
          {logoItem("Design")}
          {logoItem("System")}
          {logoItem("Components")}
          {logoItem("React")}
          {logoItem("Tailwind")}
        </ScrollVelocityRow>
      </ScrollVelocityContainer>
      <div className="h-[200px]" />
    </div>
  ),
};

export const DualRows: Story = {
  render: () => (
    <div className="h-[400px] overflow-y-scroll">
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        ↕ Scroll to see velocity effect
      </div>
      <ScrollVelocityContainer className="space-y-4 py-8 text-2xl font-semibold">
        <ScrollVelocityRow baseVelocity={8} direction={1}>
          {["Next.js", "TypeScript", "Tailwind", "Turborepo", "pnpm"].map((t) => (
            <span key={t} className="mx-8 text-foreground">
              {t}
            </span>
          ))}
        </ScrollVelocityRow>
        <ScrollVelocityRow baseVelocity={8} direction={-1}>
          {["Framer Motion", "ShadCN", "Storybook", "Mintlify", "COBE"].map((t) => (
            <span key={t} className="mx-8 text-muted-foreground">
              {t}
            </span>
          ))}
        </ScrollVelocityRow>
      </ScrollVelocityContainer>
      <div className="h-[200px]" />
    </div>
  ),
};

export const StandaloneRow: Story = {
  render: () => (
    <div className="py-4">
      <ScrollVelocityRow baseVelocity={10} className="text-xl font-medium">
        {["⭐ Feature 1", "🚀 Feature 2", "💡 Feature 3", "🔒 Feature 4", "⚡ Feature 5"].map(
          (t) => (
            <span key={t} className="mx-6 whitespace-nowrap">
              {t}
            </span>
          ),
        )}
      </ScrollVelocityRow>
    </div>
  ),
};

export const FastVelocity: Story = {
  render: () => (
    <div className="py-4">
      <ScrollVelocityRow baseVelocity={30} className="text-3xl font-bold text-primary">
        {["FAST", "SCROLL", "MARQUEE", "EFFECT", "TICKER"].map((t) => (
          <span key={t} className="mx-8">
            {t}
          </span>
        ))}
      </ScrollVelocityRow>
    </div>
  ),
};
