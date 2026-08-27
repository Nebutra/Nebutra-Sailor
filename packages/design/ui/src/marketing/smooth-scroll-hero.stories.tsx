import type { Meta, StoryObj } from "@storybook/react";
import { SmoothScrollHero } from "./smooth-scroll-hero";

const meta: Meta<typeof SmoothScrollHero> = {
  title: "Marketing/SmoothScrollHero",
  component: SmoothScrollHero,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Hero whose artwork un-clips and zooms as the page scrolls. The effect only reads with a tall scroll area, so scroll the preview rather than judging the first frame.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SmoothScrollHero>;

// Self-contained gradient stand-in for the production artwork.
const artwork = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="%230033FE"/><stop offset="100%" stop-color="%230BF1C3"/>
    </linearGradient></defs>
    <rect width="1600" height="900" fill="url(%23g)"/>
  </svg>`,
)}`;

export const Default: Story = { args: { desktopImage: artwork } };

export const ShorterScroll: Story = { args: { desktopImage: artwork, scrollHeight: 900 } };
