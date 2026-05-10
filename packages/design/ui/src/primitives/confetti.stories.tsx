import type { Meta, StoryObj } from "@storybook/react";
import { useRef } from "react";
import type { ConfettiRef } from "./confetti";
import { Confetti, ConfettiButton } from "./confetti";

const meta = {
  title: "Primitives/Confetti",
  component: Confetti,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Canvas confetti animation via canvas-confetti library. Supports auto-fire on mount, imperative ref control, and a ConfettiButton convenience component.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Confetti>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AutoFire: Story = {
  render: () => (
    <div className="relative h-48 w-96">
      <Confetti
        className="absolute inset-0 w-full h-full pointer-events-none"
        options={{ particleCount: 80, spread: 70, origin: { y: 0.6 } }}
      />
      <div className="flex h-full items-center justify-center">
        <p className="text-lg font-semibold">🎉 Celebration!</p>
      </div>
    </div>
  ),
};

export const ManualControl: Story = {
  render: () => {
    const confettiRef = useRef<ConfettiRef>(null);
    return (
      <div className="relative flex flex-col items-center gap-4">
        <Confetti
          ref={confettiRef}
          manualstart
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        <button
          type="button"
          onClick={() => confettiRef.current?.fire({ particleCount: 100, spread: 80 })}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Fire Confetti!
        </button>
        <p className="text-xs text-muted-foreground">Click the button to trigger</p>
      </div>
    );
  },
};

export const WithConfettiButton: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <ConfettiButton variant="default">🎊 Celebrate</ConfettiButton>
      <p className="text-xs text-muted-foreground">Click to fire confetti from the button</p>
    </div>
  ),
};

export const CustomColors: Story = {
  render: () => {
    const confettiRef = useRef<ConfettiRef>(null);
    return (
      <div className="relative flex flex-col items-center gap-4">
        <Confetti
          ref={confettiRef}
          manualstart
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        <button
          type="button"
          onClick={() =>
            confettiRef.current?.fire({
              particleCount: 150,
              spread: 100,
              colors: ["#0033FE", "#00e5ff", "#ffffff"],
              origin: { y: 0.8 },
            })
          }
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white"
        >
          Brand Colors Confetti
        </button>
      </div>
    );
  },
};
