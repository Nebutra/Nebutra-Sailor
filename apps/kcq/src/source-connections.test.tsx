// @vitest-environment jsdom
/** Real form interactions protect input keys and report only successful probes. */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceConnections } from "./source-connections";

function props() {
  return {
    signedIn: true,
    signInUrl: "/sign-in",
    connections: [],
    canManage: true,
    busy: false,
    error: "",
    onSave: vi.fn(async () => false),
    onTest: vi.fn(async () => false),
    onRemove: vi.fn(async () => true),
    onRetry: vi.fn(async () => true),
  };
}
afterEach(cleanup);
describe("customer source form", () => {
  it("shows shared field validation without a browser popup or submitting invalid credentials", () => {
    const actions = props();
    render(createElement(SourceConnections, actions));
    fireEvent.click(screen.getByRole("button", { name: "连接行情源" }));
    const key = screen.getByLabelText("API Key");
    const form = key.closest("form");
    if (!form) throw new Error("Credential form was not rendered");
    fireEvent.submit(form);
    expect(actions.onSave).not.toHaveBeenCalled();
    expect(key.getAttribute("aria-invalid")).toBe("true");
    const error = screen.getByRole("alert");
    expect(key.getAttribute("aria-describedby")?.split(" ")).toContain(error.id);
  });
  it("focuses the credential editor and restores its trigger on cancellation", async () => {
    render(createElement(SourceConnections, props()));
    const trigger = screen.getByRole("button", { name: "连接行情源" });
    fireEvent.click(trigger);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("连接名称")));
    fireEvent.keyDown(screen.getByLabelText("API Key"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByLabelText("API Key")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
  it("reinitializes fields when switching between existing connections", async () => {
    const connections = ["First", "Second"].map((label) => ({
      id: label,
      provider: "twelvedata",
      label,
      maskedKey: "••••1234",
      updatedAt: "2026-10-08",
    }));
    render(createElement(SourceConnections, { ...props(), connections }));
    const [first, second] = screen.getAllByRole("button", { name: "替换 Key" });
    if (!first || !second) throw new Error("Connection editors were not rendered");
    fireEvent.click(first);
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "old-private-key" } });
    fireEvent.click(second);
    expect(screen.getByLabelText("连接名称")).toHaveProperty("value", "Second");
    expect(screen.getByLabelText("API Key")).toHaveProperty("value", "");
  });
  it("uses a password input and clears the key after a failed save", async () => {
    const actions = props();
    const view = render(createElement(SourceConnections, actions));
    fireEvent.click(screen.getByRole("button", { name: "连接行情源" }));
    const key = screen.getByLabelText("API Key");
    expect(key.getAttribute("type")).toBe("password");
    fireEvent.change(key, { target: { value: "private-key-1234" } });
    fireEvent.click(screen.getByRole("button", { name: "保存连接" }));
    await waitFor(() =>
      expect(actions.onSave).toHaveBeenCalledWith("Twelve Data", "private-key-1234", undefined),
    );
    await waitFor(() => expect(screen.getByLabelText("API Key")).toHaveProperty("value", ""));
    view.rerender(createElement(SourceConnections, { ...actions, error: "服务暂不可用" }));
    expect(screen.getByLabelText("API Key")).toHaveProperty("value", "");
  });
  it("does not claim a failed probe succeeded", async () => {
    const actions = {
      ...props(),
      connections: [
        {
          id: "a",
          provider: "twelvedata",
          label: "Mine",
          maskedKey: "••••1234",
          updatedAt: "2026-10-08",
        },
      ],
    };
    render(createElement(SourceConnections, actions));
    fireEvent.click(screen.getByRole("button", { name: "测试" }));
    await waitFor(() => expect(actions.onTest).toHaveBeenCalledWith("a"));
    expect(screen.queryByText("连接成功")).toBeNull();
  });
  it("gates credential mutation UI by actual workspace permissions", () => {
    render(createElement(SourceConnections, { ...props(), canManage: false }));
    expect(screen.queryByRole("button", { name: "连接行情源" })).toBeNull();
  });
});
