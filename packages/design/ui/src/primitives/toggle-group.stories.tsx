import { DeviceDesktop as Monitor, Moon, Sun } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const meta = {
  title: "Primitives/ToggleGroup",
  component: ToggleGroup,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'Context-based selection group for segmented controls and mode switches. `type="single"` renders `role="radiogroup"` with roving-tabindex + arrow-key/Home/End keyboard navigation (WAI-ARIA radio pattern); `type="multiple"` renders `role="group"` with independently-tabbable toggle buttons. Use the `pill` variant for a segmented, rounded-full look (theme switcher, mode picker); `default`/`outline` for a boxed segmented control.',
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Single-select (default) ───────────────────────────────────────────────

export const Default: Story = {
  render: () => {
    const [value, setValue] = React.useState("list");
    return (
      <ToggleGroup type="single" value={value} onValueChange={(v) => setValue(v as string)}>
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="board">Board</ToggleGroupItem>
        <ToggleGroupItem value="table">Table</ToggleGroupItem>
      </ToggleGroup>
    );
  },
};

export const Outline: Story = {
  render: () => {
    const [value, setValue] = React.useState("day");
    return (
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        onValueChange={(v) => setValue(v as string)}
      >
        <ToggleGroupItem value="day" variant="outline">
          Day
        </ToggleGroupItem>
        <ToggleGroupItem value="week" variant="outline">
          Week
        </ToggleGroupItem>
        <ToggleGroupItem value="month" variant="outline">
          Month
        </ToggleGroupItem>
      </ToggleGroup>
    );
  },
};

// ─── Pill — segmented, rounded-full ────────────────────────────────────────

export const Pill: Story = {
  name: "Pill (segmented)",
  render: () => {
    const [value, setValue] = React.useState("system");
    return (
      <ToggleGroup
        type="single"
        variant="pill"
        value={value}
        onValueChange={(v) => setValue(v as string)}
        aria-label="Theme"
      >
        <ToggleGroupItem value="light" variant="pill">
          <Sun className="h-3.5 w-3.5" aria-hidden />
          <span>Light</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" variant="pill">
          <Moon className="h-3.5 w-3.5" aria-hidden />
          <span>Dark</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="system" variant="pill">
          <Monitor className="h-3.5 w-3.5" aria-hidden />
          <span>System</span>
        </ToggleGroupItem>
      </ToggleGroup>
    );
  },
};

// ─── Multiple select ────────────────────────────────────────────────────────

export const Multiple: Story = {
  render: () => {
    const [value, setValue] = React.useState<string[]>(["bold"]);
    return (
      <ToggleGroup
        type="multiple"
        value={value}
        onValueChange={(v) => setValue(v as string[])}
        aria-label="Text formatting"
      >
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
        <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
      </ToggleGroup>
    );
  },
};

// ─── Keyboard navigation demo ───────────────────────────────────────────────

export const KeyboardNavigation: Story = {
  name: "Keyboard Navigation (single = radiogroup)",
  render: () => {
    const [value, setValue] = React.useState("mode-1");
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-xs text-muted-foreground">
          Tab to focus the selected pill, then use ← → (or ↑ ↓), Home, End to move — focus and
          selection move together, wrapping at the ends.
        </p>
        <ToggleGroup
          type="single"
          variant="pill"
          value={value}
          onValueChange={(v) => setValue(v as string)}
          aria-label="Mode"
        >
          <ToggleGroupItem value="mode-1" variant="pill">
            Ask
          </ToggleGroupItem>
          <ToggleGroupItem value="mode-2" variant="pill">
            Agent
          </ToggleGroupItem>
          <ToggleGroupItem value="mode-3" variant="pill">
            Plan
          </ToggleGroupItem>
          <ToggleGroupItem value="mode-4" variant="pill">
            Review
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{value}</span>
        </p>
      </div>
    );
  },
};

// ─── All variants showcase ──────────────────────────────────────────────────

export const AllVariants: Story = {
  name: "All Variants",
  render: () => {
    const [a, setA] = React.useState("list");
    const [b, setB] = React.useState("day");
    const [c, setC] = React.useState("system");
    return (
      <div className="flex flex-col items-start gap-4">
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">default — boxed segmented control</p>
          <ToggleGroup type="single" value={a} onValueChange={(v) => setA(v as string)}>
            <ToggleGroupItem value="list">List</ToggleGroupItem>
            <ToggleGroupItem value="board">Board</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">outline — bordered segments</p>
          <ToggleGroup
            type="single"
            variant="outline"
            value={b}
            onValueChange={(v) => setB(v as string)}
          >
            <ToggleGroupItem value="day" variant="outline">
              Day
            </ToggleGroupItem>
            <ToggleGroupItem value="week" variant="outline">
              Week
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">
            pill — segmented, rounded-full (theme / mode switcher)
          </p>
          <ToggleGroup
            type="single"
            variant="pill"
            value={c}
            onValueChange={(v) => setC(v as string)}
          >
            <ToggleGroupItem value="light" variant="pill">
              Light
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" variant="pill">
              Dark
            </ToggleGroupItem>
            <ToggleGroupItem value="system" variant="pill">
              System
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    );
  },
};
