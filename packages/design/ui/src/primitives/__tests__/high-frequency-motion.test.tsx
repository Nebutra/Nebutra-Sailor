import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { overlayClassNames } from "../../tokens/components/overlay";
import { Button } from "../button";
import { CommandMenuInput, CommandMenuList, CommandMenuRoot } from "../command-menu-parts";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";

describe("high-frequency interaction motion", () => {
  it("presses the product Button with the brand flow scale", () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.className).toMatch(/active:scale-\[0\.97\]/u);
    expect(button.className).toMatch(/duration-flow/u);
    expect(button.className).toMatch(/ease-\[var\(--ease-brand\)\]/u);
  });

  it("opens the command palette without a scale or transition recipe", () => {
    render(
      <CommandMenuRoot open setOpen={() => undefined} label="Command Menu">
        <CommandMenuInput placeholder="What do you need?" />
        <CommandMenuList>Palette</CommandMenuList>
      </CommandMenuRoot>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain(overlayClassNames.commandSurface);
    expect(dialog.className).not.toMatch(/transition/u);
    expect(dialog.className).not.toMatch(/scale-/u);
    expect(dialog.className).not.toMatch(/starting-style/u);
  });

  it("skips delay and duration on the next tooltip in the 400ms window", async () => {
    const user = userEvent.setup();

    render(
      <div className="flex gap-4">
        <Tooltip>
          <TooltipTrigger>First</TooltipTrigger>
          <TooltipContent>First hint</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>Second</TooltipTrigger>
          <TooltipContent>Second hint</TooltipContent>
        </Tooltip>
      </div>,
    );

    await user.hover(screen.getByRole("button", { name: "First" }));
    await screen.findByText("First hint");

    await user.hover(screen.getByRole("button", { name: "Second" }));
    const second = await screen.findByText("Second hint");

    await waitFor(() => {
      expect(second).toHaveAttribute("data-instant");
    });
  });
});
