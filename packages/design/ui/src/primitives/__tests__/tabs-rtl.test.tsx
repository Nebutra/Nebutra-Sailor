import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";

function renderTabs(wrapperDir: "ltr" | "rtl", rootDir?: "ltr" | "rtl") {
  render(
    <div dir={wrapperDir}>
      <Tabs defaultValue="a" dir={rootDir}>
        <TabsList aria-label="Files">
          <TabsTrigger value="a">a.txt</TabsTrigger>
          <TabsTrigger value="b">b.txt</TabsTrigger>
          <TabsTrigger value="c">c.txt</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A</TabsContent>
        <TabsContent value="b">B</TabsContent>
        <TabsContent value="c">C</TabsContent>
      </Tabs>
    </div>,
  );
  const [a, b, c] = screen.getAllByRole("tab");
  if (!a || !b || !c) throw new Error("expected three tabs");
  return { a, b, c };
}

describe("Tabs arrow keys under dir", () => {
  it("ArrowRight moves to the next tab in LTR (baseline)", async () => {
    const user = userEvent.setup();
    const { a, b } = renderTabs("ltr");
    a.focus();
    await user.keyboard("{ArrowRight}");
    expect(b).toHaveFocus();
  });

  it("ArrowLeft moves to the next tab inside a dir=rtl ancestor", async () => {
    const user = userEvent.setup();
    const { a, b } = renderTabs("rtl");
    a.focus();
    await user.keyboard("{ArrowLeft}");
    expect(b).toHaveFocus();
  });

  it("ArrowRight moves to the previous tab inside a dir=rtl ancestor", async () => {
    const user = userEvent.setup();
    const { a, c } = renderTabs("rtl");
    a.focus();
    // wraps from the first tab back to the last
    await user.keyboard("{ArrowRight}");
    expect(c).toHaveFocus();
  });

  it("follows dir set on Tabs itself", async () => {
    const user = userEvent.setup();
    const { a, b } = renderTabs("ltr", "rtl");
    a.focus();
    await user.keyboard("{ArrowLeft}");
    expect(b).toHaveFocus();
  });
});
