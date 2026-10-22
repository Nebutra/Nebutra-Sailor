import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "../primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover";
import { PortalContainerProvider } from "./portal-container";

const meta = {
  title: "Utilities/Portal container",
  component: PortalContainerProvider,
  parameters: { layout: "centered" },
} satisfies Meta<typeof PortalContainerProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function ScopedPopover() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    <div className="dark rounded-lg bg-background p-8 text-foreground" ref={setHost}>
      <PortalContainerProvider container={host}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open themed popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            This popup inherits the dark container while the surrounding page stays light.
          </PopoverContent>
        </Popover>
      </PortalContainerProvider>
    </div>
  );
}

export const ThemedScope: Story = {
  args: { container: null, children: null },
  render: () => <ScopedPopover />,
};
