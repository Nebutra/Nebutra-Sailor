// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfilePage } from "./profile-page";

const context = {
  user: { id: "user-one", name: "Alex", email: "alex@example.test", image: null },
  activeWorkspaceId: null,
  workspaces: [],
};
function authClient() {
  return {
    getContext: vi.fn().mockResolvedValue(context),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    selectWorkspace: vi.fn(),
    signOut: vi.fn(),
  };
}
afterEach(cleanup);

it("renders shared identity on the profile page without a chart", () => {
  render(createElement(ProfilePage, { context, auth: authClient() }));
  expect(screen.getByRole("heading", { name: "个人资料" })).toBeTruthy();
  expect(screen.getByLabelText("显示名称")).toHaveProperty("value", "Alex");
  expect(screen.queryByLabelText("图表与 Agent 工作台")).toBeNull();
});

it("keeps signed-out users on a login surface with a profile return URL", () => {
  render(createElement(ProfilePage, { context: null, auth: authClient() }));
  const url = new URL(
    screen.getByRole("link", { name: "登录 Nebutra" }).getAttribute("href") ?? "",
  );
  expect(url.searchParams.get("returnTo")).toContain("/settings/profile");
  expect(screen.queryByLabelText("显示名称")).toBeNull();
});

it("retains the form and displays provider errors without claiming success", async () => {
  const auth = authClient();
  auth.updateProfile.mockRejectedValue(new Error("Session expired"));
  render(createElement(ProfilePage, { context, auth }));
  fireEvent.change(screen.getByLabelText("显示名称"), { target: { value: "Taylor" } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Session expired"));
  expect(screen.getByLabelText("显示名称")).toHaveProperty("value", "Taylor");
  expect(screen.queryByText("已保存")).toBeNull();
});

it("refreshes the shared identity after saving instead of assuming the submitted name persisted", async () => {
  const auth = authClient();
  auth.getContext.mockResolvedValueOnce(context).mockResolvedValue({
    ...context,
    user: { ...context.user, name: "Taylor" },
  });
  render(createElement(ProfilePage, { context, auth }));
  fireEvent.change(screen.getByLabelText("显示名称"), { target: { value: " Taylor " } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("已保存"));
  expect(auth.updateProfile).toHaveBeenCalledWith("Taylor");
  expect(screen.getByRole("heading", { name: "Taylor" })).toBeTruthy();
});
