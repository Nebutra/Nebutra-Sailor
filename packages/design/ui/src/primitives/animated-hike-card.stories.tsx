import type { Meta, StoryObj } from "@storybook/react";
import { BookOpen, Clock, FileCode, Layers, Map, TrendingUp } from "lucide-react";
import { AnimatedHikeCard } from "./animated-hike-card";

const meta = {
  title: "Primitives/AnimatedHikeCard",
  component: AnimatedHikeCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Interactive card with stacked images that fan out on hover. Features title, stats chips, and description. Renders as an anchor element.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AnimatedHikeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Placeholder gradient images for demos
const gradientImages = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%236366f1'/%3E%3Cstop offset='1' stop-color='%23a855f7'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23g)'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%238b5cf6'/%3E%3Cstop offset='1' stop-color='%23ec4899'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23g)'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23a855f7'/%3E%3Cstop offset='1' stop-color='%236366f1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23g)'/%3E%3C/svg%3E",
];

export const Default: Story = {
  render: () => (
    <AnimatedHikeCard
      title="Mountain Trek"
      images={gradientImages}
      stats={[
        { icon: <Clock className="h-4 w-4" />, label: "~6 Hours" },
        { icon: <Map className="h-4 w-4" />, label: "8 km" },
        { icon: <TrendingUp className="h-4 w-4" />, label: "Hard" },
      ]}
      description="A beautiful trail through alpine meadows and rocky peaks with panoramic summit views."
      href="/"
    />
  ),
};

export const EasyTrail: Story = {
  render: () => (
    <AnimatedHikeCard
      title="Coastal Walk"
      images={gradientImages}
      stats={[
        { icon: <Clock className="h-4 w-4" />, label: "~3 Hours" },
        { icon: <Map className="h-4 w-4" />, label: "12 km" },
        { icon: <TrendingUp className="h-4 w-4" />, label: "Easy" },
      ]}
      description="Follow the stunning coastline with panoramic ocean views and gentle sea breezes."
      href="/"
    />
  ),
};

export const ProductShowcase: Story = {
  render: () => (
    <AnimatedHikeCard
      title="Design System"
      images={gradientImages}
      stats={[
        { icon: <Layers className="h-4 w-4" />, label: "120+ Components" },
        { icon: <FileCode className="h-4 w-4" />, label: "TypeScript" },
        { icon: <BookOpen className="h-4 w-4" />, label: "Full Docs" },
      ]}
      description="A complete design system for modern web applications — tokens, primitives, and patterns."
      href="/"
    />
  ),
};

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <AnimatedHikeCard
        title="Mountain Trek"
        images={gradientImages}
        stats={[
          { icon: <Clock className="h-4 w-4" />, label: "~6 Hours" },
          { icon: <Map className="h-4 w-4" />, label: "8 km" },
        ]}
        description="A challenging high-altitude route with panoramic views."
        href="/"
      />
      <AnimatedHikeCard
        title="Coastal Walk"
        images={gradientImages}
        stats={[
          { icon: <Clock className="h-4 w-4" />, label: "~3 Hours" },
          { icon: <Map className="h-4 w-4" />, label: "12 km" },
        ]}
        description="A relaxing coastal trail with ocean views."
        href="/"
      />
    </div>
  ),
};
