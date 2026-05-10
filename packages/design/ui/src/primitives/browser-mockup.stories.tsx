import type { Meta, StoryObj } from "@storybook/react";
import { Browser } from "./browser-mockup";

const meta = {
  title: "Primitives/Browser",
  component: Browser,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Geist-style browser window frame with traffic lights, navigation buttons, address bar with copy-to-clipboard, and a flexible content area that accepts arbitrary children.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Browser>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[700px]">
      <Browser address="vercel.com">
        <div className="p-6" />
      </Browser>
    </div>
  ),
};

export const WithChildren: Story = {
  render: () => (
    <div className="w-[700px]">
      <Browser address="app.nebutra.com/dashboard">
        <div className="flex flex-col gap-4 p-8">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
      </Browser>
    </div>
  ),
};

export const WithImage: Story = {
  render: () => (
    <div className="w-[700px]">
      <Browser
        address="example.com"
        imageSrc="https://placehold.co/800x450/f4f4f5/a1a1aa?text=Website+Preview"
      />
    </div>
  ),
};

export const NoAddress: Story = {
  render: () => (
    <div className="w-[700px]">
      <Browser>
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          Empty browser frame
        </div>
      </Browser>
    </div>
  ),
};

export const RichContent: Story = {
  render: () => (
    <div className="w-[700px]">
      <Browser address="nebutra.com">
        <div className="bg-gradient-to-b from-blue-50 to-white p-8 dark:from-blue-950 dark:to-background">
          <h2 className="text-xl font-bold text-foreground">Welcome to Nebutra</h2>
          <p className="mt-2 text-sm text-muted-foreground">Build fast. Ship faster.</p>
          <div className="mt-6 flex gap-3">
            <span className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white">
              Get Started
            </span>
            <span className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground">
              Documentation
            </span>
          </div>
        </div>
      </Browser>
    </div>
  ),
};
