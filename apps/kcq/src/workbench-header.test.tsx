// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorkbenchHeader } from "./workbench-header";

afterEach(cleanup);
it("keeps the account trigger's visible identity and opens the shared menu", async () => {
  render(
    <WorkbenchHeader
      context={null}
      busy={false}
      signInUrl="/sign-in"
      onSwitch={vi.fn()}
      onSignOut={vi.fn()}
    />,
  );
  const trigger = screen.getByRole("button", { name: "账户与工作区菜单" });
  expect(trigger.textContent).toContain("工作区");
  trigger.focus();
  fireEvent.click(trigger);
  await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
  expect(screen.getByRole("menuitem", { name: /登录 Nebutra/ })).toBeTruthy();
});
