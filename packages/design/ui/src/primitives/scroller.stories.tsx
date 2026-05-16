import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { Scroller } from "./scroller";

const meta = {
  title: "Primitives/Scroller",
  component: Scroller,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Native overflow surface for peer-item lists. Optional buttons scroll to direct children only.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Scroller>;

export default meta;
type Story = StoryObj<typeof meta>;

const tiles = Array.from({ length: 6 }, (_, index) => index + 1);

function DemoTile({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={[
        "grid shrink-0 place-items-center rounded-[var(--radius-md)] border border-border bg-muted text-sm font-medium text-foreground",
        wide
          ? "h-[var(--scroller-story-tile-wide)] w-[var(--scroller-story-tile-wide)]"
          : "size-[var(--scroller-story-tile)]",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export const Vertical: Story = {
  args: {
    height: 220,
    overflow: "y",
    width: "100%",
    contentLabel: "deployment activity",
  },
  render: (args) => (
    <div className="w-[var(--scroller-story-width)] [--scroller-story-tile:256px] [--scroller-story-width:420px]">
      <Scroller {...args} childrenContainerClassName="gap-4">
        <DemoTile>Build queued</DemoTile>
        <DemoTile>Checks running</DemoTile>
      </Scroller>
    </div>
  ),
};

export const Horizontal: Story = {
  args: {
    height: 180,
    overflow: "x",
    width: "100%",
    contentLabel: "region chips",
  },
  render: (args) => (
    <div className="w-[var(--scroller-story-width)] [--scroller-story-tile:160px] [--scroller-story-width:520px]">
      <Scroller {...args} childrenContainerClassName="gap-3">
        {tiles.map((tile) => (
          <DemoTile key={tile}>Region {tile}</DemoTile>
        ))}
      </Scroller>
    </div>
  ),
};

export const Free: Story = {
  args: {
    height: 220,
    overflow: "both",
    width: "100%",
    contentLabel: "log matrix",
  },
  render: (args) => (
    <div className="w-[var(--scroller-story-width)] [--scroller-story-tile-wide:240px] [--scroller-story-width:520px]">
      <Scroller {...args}>
        <div className="grid grid-flow-col grid-rows-2 gap-4">
          {tiles.map((tile) => (
            <DemoTile key={tile} wide>
              Cell {tile}
            </DemoTile>
          ))}
        </div>
      </Scroller>
    </div>
  ),
};

export const VerticalWithButtons: Story = {
  args: {
    height: 220,
    overflow: "y",
    withButtons: true,
    contentLabel: "audit events",
  },
  render: (args) => (
    <div className="w-[var(--scroller-story-width)] [--scroller-story-tile:192px] [--scroller-story-width:420px]">
      <Scroller {...args} childrenContainerClassName="gap-4">
        {tiles.slice(0, 4).map((tile) => (
          <DemoTile key={tile}>Event {tile}</DemoTile>
        ))}
      </Scroller>
    </div>
  ),
};

export const HorizontalWithButtons: Story = {
  args: {
    height: 180,
    overflow: "x",
    width: "100%",
    withButtons: true,
    contentLabel: "customer logos",
  },
  render: (args) => (
    <div className="w-[var(--scroller-story-width)] [--scroller-story-tile:176px] [--scroller-story-width:520px]">
      <Scroller {...args} childrenContainerClassName="gap-4">
        {tiles.map((tile) => (
          <DemoTile key={tile}>Logo {tile}</DemoTile>
        ))}
      </Scroller>
    </div>
  ),
};

export const Empty: Story = {
  args: {
    height: 160,
    overflow: "y",
    withButtons: true,
    contentLabel: "empty activity",
  },
  render: (args) => (
    <div className="w-[var(--scroller-story-width)] [--scroller-story-width:420px]">
      <Scroller {...args}>
        <div className="grid h-32 place-items-center rounded-[var(--radius-md)] border border-dashed border-border text-muted-foreground text-sm">
          No events
        </div>
      </Scroller>
    </div>
  ),
};

export const DarkMode: Story = {
  args: {
    height: 180,
    overflow: "x",
    width: "100%",
    withButtons: true,
    contentLabel: "dark mode tiles",
  },
  render: (args) => (
    <div className="dark w-[var(--scroller-story-width)] rounded-[var(--radius-lg)] bg-background p-6 [--scroller-story-tile:160px] [--scroller-story-width:520px]">
      <Scroller {...args} childrenContainerClassName="gap-4">
        {tiles.map((tile) => (
          <DemoTile key={tile}>Tile {tile}</DemoTile>
        ))}
      </Scroller>
    </div>
  ),
};
