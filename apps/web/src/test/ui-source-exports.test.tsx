// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { PortalContainerProvider } from "@nebutra/ui/utils";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";

afterEach(cleanup);

it("shares the portal scope across the utility and primitive source entry points", async () => {
  function ScopedPopover() {
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    return (
      <div ref={setHost} data-testid="portal-host">
        <PortalContainerProvider container={host}>
          <Popover defaultOpen>
            <PopoverTrigger>Details</PopoverTrigger>
            <PopoverContent aria-label="Scoped details">Portal content</PopoverContent>
          </Popover>
        </PortalContainerProvider>
      </div>
    );
  }

  render(<ScopedPopover />);

  const popup = await screen.findByRole("dialog", { name: "Scoped details" });
  await waitFor(() => expect(screen.getByTestId("portal-host")).toContainElement(popup));
});
