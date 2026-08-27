import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent } from "./card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./carousel";

const meta: Meta<typeof Carousel> = {
  title: "Primitives/Carousel",
  component: Carousel,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Embla-backed slide viewport. `CarouselContent` is the scroll track, each `CarouselItem` a slide (`basis-full` by default — override with a Tailwind `basis-*` class to show more than one at a time), and `CarouselPrevious` / `CarouselNext` read `canScrollPrev` / `canScrollNext` off context to disable themselves at the ends. Arrow keys move the slide while the carousel region has focus.",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Carousel>;

function Slide({ label }: { label: string }) {
  return (
    <Card className="flex aspect-video items-center justify-center">
      <CardContent className="flex items-center justify-center pt-6 text-2xl font-semibold text-muted-foreground">
        {label}
      </CardContent>
    </Card>
  );
}

export const Default: Story = {
  render: () => (
    <Carousel className="w-80">
      <CarouselContent>
        {["1", "2", "3", "4", "5"].map((n) => (
          <CarouselItem key={n}>
            <Slide label={n} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

/** `basis-1/2` on each `CarouselItem` shows two slides at a time instead of one. */
export const MultipleSlidesVisible: Story = {
  name: "Multiple Slides Visible",
  render: () => (
    <Carousel className="w-96" opts={{ align: "start" }}>
      <CarouselContent>
        {["1", "2", "3", "4", "5", "6"].map((n) => (
          <CarouselItem key={n} className="basis-1/2">
            <Slide label={n} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

/** `orientation="vertical"` moves both scroll axis and Previous/Next placement. */
export const Vertical: Story = {
  render: () => (
    <Carousel orientation="vertical" className="h-72 w-64" opts={{ align: "start" }}>
      <CarouselContent className="h-72">
        {["1", "2", "3"].map((n) => (
          <CarouselItem key={n} className="basis-1/3">
            <Slide label={n} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

/**
 * Without `loop: true`, `CarouselPrevious` disables itself at the first
 * slide — this is `canScrollPrev` from context, not a visual-only state.
 */
export const AtStart: Story = {
  name: "Boundary — Previous disabled",
  render: () => (
    <Carousel className="w-80">
      <CarouselContent>
        {["1", "2", "3"].map((n) => (
          <CarouselItem key={n}>
            <Slide label={n} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

export const SingleSlide: Story = {
  name: "Single item (Next disabled)",
  render: () => (
    <Carousel className="w-80">
      <CarouselContent>
        <CarouselItem>
          <Slide label="1" />
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
};

export const DarkMode: Story = {
  render: () => (
    <div className="dark rounded-[var(--radius-lg)] bg-background p-8">
      <Carousel className="w-80">
        <CarouselContent>
          {["1", "2", "3"].map((n) => (
            <CarouselItem key={n}>
              <Slide label={n} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  ),
};
