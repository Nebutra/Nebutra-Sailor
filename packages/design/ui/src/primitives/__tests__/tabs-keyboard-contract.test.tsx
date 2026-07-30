import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";

/**
 * Verifies the keyboard contract that app-side hand-rolled tablists were
 * replaced for, rather than assuming Base UI supplies it. Two real defects were
 * being carried in `apps/forge`: one strip moved the selection on arrow keys but
 * never moved DOM focus, and another set a roving tabindex with no key handler
 * at all, which left the unselected tab unreachable from the keyboard.
 */
function Harness() {
  const [value, setValue] = useState("a");
  return (
    <Tabs value={value} onValueChange={setValue} variant="button" shape="pill" size="sm">
      <TabsList aria-label="Files">
        <TabsTrigger value="a">a.txt</TabsTrigger>
        <TabsTrigger value="b">b.txt</TabsTrigger>
        <TabsTrigger value="c">c.txt</TabsTrigger>
      </TabsList>
      <TabsContent value="a">A</TabsContent>
      <TabsContent value="b">B</TabsContent>
      <TabsContent value="c">C</TabsContent>
    </Tabs>
  );
}

describe("Tabs keyboard contract", () => {
  it("moves focus with ArrowRight/ArrowLeft and wraps, and honours Home/End", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const [a, b, c] = screen.getAllByRole("tab");
    if (!a || !b || !c) throw new Error("expected three tabs");

    a.focus();
    expect(a).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(b).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(c).toHaveFocus();

    // Loops rather than dead-ending — what the hand-rolled strips did by hand.
    await user.keyboard("{ArrowRight}");
    expect(a).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(c).toHaveFocus();

    await user.keyboard("{Home}");
    expect(a).toHaveFocus();

    await user.keyboard("{End}");
    expect(c).toHaveFocus();
  });

  it("keeps every tab keyboard-reachable and only mounts the selected panel", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const [a, , c] = screen.getAllByRole("tab");
    if (!a || !c) throw new Error("expected three tabs");

    a.focus();
    await user.keyboard("{End}{Enter}");

    expect(c).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("C");
  });
});
