import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import type * as React from "react";
import { Button } from "./button";
import { Grid } from "./grid-system";
import { Spinner } from "./spinner";

const meta = {
  title: "Primitives/Grid",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Display elements in a two-dimensional grid layout where decorative guide lines are part of the visual system.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function DemoCell({
  children,
  tone = "muted",
  className,
}: {
  children?: React.ReactNode;
  tone?: "muted" | "strong";
  className?: string;
}) {
  return (
    <div
      className={[
        "flex h-full min-h-[inherit] items-center justify-center text-center text-sm",
        tone === "strong" ? "font-medium text-foreground" : "text-muted-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

const numbers = [1, 2, 3, 4, 5, 6] as const;

export const Default: Story = {
  render: () => (
    <Grid.System debug guideWidth={1} unstable_useContainer>
      <Grid columns={5} height="preserve-aspect-ratio" rows={2} />
    </Grid.System>
  ),
};

export const BasicGrid: Story = {
  render: () => (
    <Grid.System guideWidth={1} unstable_useContainer>
      <Grid columns={3} rows={2}>
        {numbers.map((number) => (
          <Grid.Cell key={number}>
            <DemoCell>{number}</DemoCell>
          </Grid.Cell>
        ))}
      </Grid>
    </Grid.System>
  ),
};

export const SolidCells: Story = {
  render: () => (
    <Grid.System guideWidth={1} unstable_useContainer>
      <Grid columns={3} rows={2}>
        {numbers.map((number) => (
          <Grid.Cell key={number} solid>
            <DemoCell tone="strong">{number}</DemoCell>
          </Grid.Cell>
        ))}
      </Grid>
    </Grid.System>
  ),
};

export const ResponsiveGrid: Story = {
  render: () => (
    <Grid.System guideWidth={1} unstable_useContainer>
      <Grid columns={{ sm: 1, md: 2, lg: 3 }} rows={{ sm: 6, md: 3, lg: 2 }}>
        {numbers.map((number) => (
          <Grid.Cell key={number}>
            <DemoCell>{number}</DemoCell>
          </Grid.Cell>
        ))}
      </Grid>
    </Grid.System>
  ),
};

export const ResponsiveGuideClipping: Story = {
  render: () => (
    <Grid.System unstable_useContainer>
      <Grid columns={{ sm: 1, md: 2, lg: 3 }} rows={{ sm: 6, md: 3, lg: 2 }}>
        <Grid.Cell column={{ sm: "1", md: "1/3" }} row={{ sm: "1/3", md: 1 }} solid>
          <DemoCell tone="strong">1 + 2</DemoCell>
        </Grid.Cell>
        <Grid.Cell>
          <DemoCell>3</DemoCell>
        </Grid.Cell>
        <Grid.Cell>
          <DemoCell>4</DemoCell>
        </Grid.Cell>
        <Grid.Cell column={{ sm: 1, md: "1/3", lg: "2/4" }} row={{ sm: "5/7", md: 3, lg: 2 }} solid>
          <DemoCell tone="strong">5 + 6</DemoCell>
        </Grid.Cell>
      </Grid>
    </Grid.System>
  ),
};

export const HiddenRowGuides: Story = {
  render: () => (
    <Grid.System unstable_useContainer>
      <Grid columns={12} height="preserve-aspect-ratio" hideGuides="row" rows={3} />
    </Grid.System>
  ),
};

export const HiddenColumnGuides: Story = {
  render: () => (
    <Grid.System unstable_useContainer>
      <Grid columns={12} height="preserve-aspect-ratio" hideGuides="column" rows={3} />
    </Grid.System>
  ),
};

export const OverlayingCells: Story = {
  render: () => (
    <Grid.System unstable_useContainer>
      <Grid columns={12} rows={3}>
        <Grid.Cell column="1/3" row="1/3" solid>
          <DemoCell tone="strong">1</DemoCell>
        </Grid.Cell>
        <Grid.Cell column="2/4" row="2/4">
          <DemoCell>2</DemoCell>
        </Grid.Cell>
        <Grid.Cell column="3/10" row="2/4">
          <DemoCell className="px-[var(--grid-cell-padding)]">
            Long copy stays inside the cell without changing the grid track math.
          </DemoCell>
        </Grid.Cell>
        <Grid.Cell column="7/12" row="1/-1" solid>
          <DemoCell tone="strong">3</DemoCell>
        </Grid.Cell>
        <Grid.Cell column="11/13" row="1/3" solid>
          <DemoCell tone="strong">4</DemoCell>
        </Grid.Cell>
      </Grid>
    </Grid.System>
  ),
};

export const SpecificGuideClipping: Story = {
  render: () => (
    <Grid.System guideWidth={1} unstable_useContainer>
      <Grid columns={3} rows={4}>
        <Grid.Cell column="1/2" row="1/3" solid>
          <DemoCell tone="strong">1</DemoCell>
        </Grid.Cell>
        <Grid.Cell column="3/4" row="1/2" solid>
          <DemoCell tone="strong">2</DemoCell>
        </Grid.Cell>
        <Grid.Cell column="2/3" row="2/4">
          <DemoCell>3</DemoCell>
        </Grid.Cell>
        <Grid.Cell column="1/2" row="4/5" solid>
          <DemoCell tone="strong">4</DemoCell>
        </Grid.Cell>
        <Grid.Cell column="3/4" row="3/5" solid>
          <DemoCell tone="strong">5</DemoCell>
        </Grid.Cell>
      </Grid>
    </Grid.System>
  ),
};

export const EdgeStates: Story = {
  render: () => (
    <Grid.System guideWidth={1} unstable_useContainer>
      <Grid columns={{ sm: 1, md: 3 }} rows={{ sm: 4, md: 2 }}>
        <Grid.Cell solid>
          <DemoCell tone="strong">Stable</DemoCell>
        </Grid.Cell>
        <Grid.Cell>
          <DemoCell>
            A very long value wraps predictably instead of widening the track or obscuring guides.
          </DemoCell>
        </Grid.Cell>
        <Grid.Cell>
          <DemoCell>No data</DemoCell>
        </Grid.Cell>
        <Grid.Cell solid>
          <DemoCell tone="strong">
            <span className="flex items-center gap-[var(--grid-cell-padding)]">
              <Spinner size={16} />
              Loading
            </span>
          </DemoCell>
        </Grid.Cell>
        <Grid.Cell column={{ sm: 1, md: "2/4" }} solid>
          <DemoCell tone="strong" className="text-destructive">
            Error: invalid track configuration
          </DemoCell>
        </Grid.Cell>
      </Grid>
    </Grid.System>
  ),
};

export const KeyboardA11y: Story = {
  render: () => (
    <Grid.System guideWidth={1} unstable_useContainer>
      <Grid columns={{ sm: 1, md: 2 }} rows={{ sm: 2, md: 1 }}>
        <Grid.Cell solid>
          <Button asChild variant="ghost">
            <a href="#project-alpha">Open Project Alpha</a>
          </Button>
        </Grid.Cell>
        <Grid.Cell solid>
          <Button asChild variant="ghost">
            <a href="#deployment-east">Open Deployment East</a>
          </Button>
        </Grid.Cell>
      </Grid>
    </Grid.System>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Open Project Alpha" })).toHaveFocus();
  },
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: "dark" },
  },
  render: () => (
    <div className="dark bg-background p-[var(--grid-cell-padding)] text-foreground">
      <Grid.System debug guideWidth={1} unstable_useContainer>
        <Grid columns={4} height="preserve-aspect-ratio" rows={2}>
          <Grid.Cell column="1/3" row="1/3" solid>
            <DemoCell tone="strong">Dark solid</DemoCell>
          </Grid.Cell>
          <Grid.Cell column="3/5" row="1/2">
            <DemoCell>Guide visible</DemoCell>
          </Grid.Cell>
          <Grid.Cell column="3/5" row="2/3" solid>
            <DemoCell tone="strong">Clipped</DemoCell>
          </Grid.Cell>
        </Grid>
      </Grid.System>
    </div>
  ),
};
