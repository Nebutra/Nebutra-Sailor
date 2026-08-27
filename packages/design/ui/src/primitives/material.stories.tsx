import type { Meta, StoryObj } from "@storybook/react";
import { Material } from "./material";

const meta = {
  title: "Primitives/Material",
  component: Material,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Surface elevation primitive. Maps semantic `type` to shadow depth and " +
          "background token — all values sourced from the project @theme token system.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["card", "menu", "modal", "fullscreen"],
      description: "Surface elevation level",
      table: { defaultValue: { summary: "card" } },
    },
  },
} satisfies Meta<typeof Material>;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Placeholder — consistent filler content across all stories
// =============================================================================

function Placeholder() {
  return (
    <div style={{ width: "100%", height: 120 }} className="rounded bg-muted" aria-hidden="true" />
  );
}

// =============================================================================
// Types — all four elevation levels side by side
// =============================================================================

export const Types: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-8 bg-muted/30 rounded-xl w-[560px]">
      {(["card", "menu", "modal", "fullscreen"] as const).map((type) => (
        <div key={type} className="flex flex-col gap-1">
          <span className="text-xs font-mono text-muted-foreground pl-1">
            type=&quot;{type}&quot;
          </span>
          <Material type={type}>
            <div className="p-4">
              <Placeholder />
            </div>
          </Material>
        </div>
      ))}
    </div>
  ),
};

// =============================================================================
// Card — default surface for page content
// =============================================================================

export const Card: Story = {
  render: () => (
    <Material type="card" className="w-80">
      <div className="p-6 flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">Card Surface</p>
        <p className="text-xs text-muted-foreground">
          Default elevation for content on a page. Uses <code>shadow-sm</code> and{" "}
          <code>bg-card</code>.
        </p>
        <Placeholder />
      </div>
    </Material>
  ),
};

// =============================================================================
// Menu — dropdown / popover elevation
// =============================================================================

export const Menu: Story = {
  render: () => (
    <Material type="menu" className="w-56">
      <div className="py-1">
        {["Profile", "Settings", "Team", "Sign out"].map((label) => (
          <button
            key={label}
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </Material>
  ),
};

// =============================================================================
// Modal — dialog / drawer elevation
// =============================================================================

export const Modal: Story = {
  render: () => (
    <div className="relative flex items-center justify-center w-[480px] h-64 bg-muted/40 rounded-xl">
      <Material type="modal" className="w-80">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm font-medium text-foreground">Modal Surface</p>
          <p className="text-xs text-muted-foreground">
            Strong elevation for dialogs and drawers. Uses <code>shadow-lg</code> and{" "}
            <code>bg-popover</code>.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-md border border-border text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </Material>
    </div>
  ),
};

// =============================================================================
// Fullscreen — overlay surface with no shadow
// =============================================================================

export const Fullscreen: Story = {
  render: () => (
    <Material type="fullscreen" className="w-[480px] h-64">
      <div className="p-6 flex flex-col gap-2 h-full">
        <p className="text-sm font-medium text-foreground">Fullscreen Surface</p>
        <p className="text-xs text-muted-foreground">
          No shadow — used when the material covers the entire viewport. Uses{" "}
          <code>bg-background</code>.
        </p>
      </div>
    </Material>
  ),
};

// =============================================================================
// Playground — interactive controls
// =============================================================================

export const Playground: Story = {
  args: { type: "card" },
  render: (args) => (
    <Material {...args} className="w-80">
      <div className="p-6">
        <Placeholder />
      </div>
    </Material>
  ),
};
