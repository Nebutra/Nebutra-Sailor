import type { Meta, StoryObj } from "@storybook/react";
import { DitheringBackground } from "./dithering-background";

const meta = {
  title: "Primitives/DitheringBackground",
  component: DitheringBackground,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "WebGL dithering shader background with glow, vignette, film grain, and parallax overlays. Theme-aware (light/dark/system) via @paper-design/shaders-react.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    themeMode: { control: "radio", options: ["light", "dark", "system"] },
    intensity: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    parallax: { control: "boolean" },
  },
} satisfies Meta<typeof DitheringBackground>;

export default meta;
type Story = StoryObj<typeof DitheringBackground>;

export const SystemMode: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <DitheringBackground themeMode="system" className="absolute" />
    </div>
  ),
};

export const LightTheme: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <DitheringBackground themeMode="light" syncTailwindDark={false} className="absolute" />
    </div>
  ),
};

export const DarkTheme: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <DitheringBackground themeMode="dark" syncTailwindDark={false} className="absolute" />
    </div>
  ),
};

export const HighIntensity: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <DitheringBackground
        themeMode="dark"
        intensity={1}
        syncTailwindDark={false}
        className="absolute"
      />
    </div>
  ),
};

export const NoOverlays: Story = {
  render: () => (
    <div className="relative h-[400px] w-full overflow-hidden">
      <DitheringBackground
        themeMode="light"
        syncTailwindDark={false}
        showGrain={false}
        showVignette={false}
        showShine={false}
        showGlow={false}
        className="absolute"
      />
    </div>
  ),
};
