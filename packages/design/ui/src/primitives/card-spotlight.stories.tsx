import type { Meta, StoryObj } from "@storybook/react";
import { CheckCircle2 } from "lucide-react";
import { CardSpotlight } from "./card-spotlight";

const meta = {
  title: "Primitives/CardSpotlight",
  component: CardSpotlight,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Card with a radial spotlight that follows the mouse cursor. On hover, a WebGL canvas reveal animation (blue/purple dots) plays. Requires three and @react-three/fiber.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    radius: { control: { type: "range", min: 100, max: 600, step: 50 } },
    color: { control: "color" },
  },
} satisfies Meta<typeof CardSpotlight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: <></> },
  render: () => (
    <CardSpotlight className="h-80 w-80">
      <h2 className="relative z-20 mt-2 text-lg font-bold text-white">Hover over this card</h2>
      <p className="relative z-20 mt-4 text-sm text-muted-foreground">
        The spotlight follows your cursor. A canvas dot animation appears on hover.
      </p>
    </CardSpotlight>
  ),
};

export const ChecklistContent: Story = {
  args: { children: <></> },
  render: () => (
    <CardSpotlight className="w-96 p-10">
      <h2 className="relative z-20 text-lg font-bold text-white mb-6">Enterprise Plan</h2>
      <div className="relative z-20 space-y-3">
        {[
          "Unlimited team members",
          "Priority support 24/7",
          "Custom domain & SSO",
          "SOC 2 compliance",
          "Data export & API",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
            <span className="text-sm text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
    </CardSpotlight>
  ),
};

export const PurpleSpotlight: Story = {
  args: { children: <></>, color: "#1a0533", radius: 300 },
  render: () => (
    <CardSpotlight color="#1a0533" radius={300} className="h-80 w-80">
      <h2 className="relative z-20 text-xl font-bold text-white">Purple Spotlight</h2>
      <p className="relative z-20 mt-3 text-sm text-muted-foreground">
        Custom color via the `color` prop.
      </p>
    </CardSpotlight>
  ),
};

export const SmallRadius: Story = {
  args: { children: <></>, radius: 150 },
  render: () => (
    <CardSpotlight radius={150} className="h-80 w-80">
      <h2 className="relative z-20 text-lg font-bold text-white">Tight Spotlight</h2>
      <p className="relative z-20 mt-3 text-sm text-muted-foreground">
        radius=150 — spotlight stays close to cursor.
      </p>
    </CardSpotlight>
  ),
};
