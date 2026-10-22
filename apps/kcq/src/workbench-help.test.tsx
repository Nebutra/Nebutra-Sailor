// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkbenchHelp } from "./workbench-help";

const props = {
  section: "guide" as const,
  signedIn: false,
  signInUrl: "/sign-in",
  analyticsConsent: false,
  diagnostics: { chartRevision: "abcdef12", theme: "light" as const, viewport: "compact" as const },
  onClose: vi.fn(),
  onConsentChange: vi.fn(() => true),
};
afterEach(cleanup);

describe("workbench guidance and support", () => {
  it("explains editable Agent prompts, billing and browser-local storage honestly", () => {
    render(<WorkbenchHelp {...props} />);
    expect(screen.getByRole("dialog", { name: "开始研究" })).toBeTruthy();
    expect(screen.getByText(/再编辑问题/)).toBeTruthy();
    expect(screen.getByText(/确认问题后再发送/)).toBeTruthy();
    expect(screen.getByText(/当前浏览器.*跨设备/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /登录/ }).getAttribute("href")).toBe("/sign-in");
    expect(screen.getByRole("checkbox", { name: /匿名使用统计/ })).toHaveProperty("checked", false);
    expect(screen.queryByRole("link", { name: /GitHub/ })).toBeNull();
    expect(screen.getByRole("button", { name: "关闭" })).toBeTruthy();
  });
  it("requires user-written feedback and keeps diagnostics off until selected", () => {
    render(<WorkbenchHelp {...props} section="feedback" />);
    expect(screen.queryByRole("link", { name: "前往 GitHub 检查并提交" })).toBeNull();
    fireEvent.change(screen.getByLabelText("遇到了什么问题，或希望改进什么？"), {
      target: { value: "商品搜索没有返回" },
    });
    let link = screen.getByRole("link", { name: "前往 GitHub 检查并提交" });
    expect(link.getAttribute("href")).not.toContain("abcdef12");
    fireEvent.click(screen.getByRole("checkbox", { name: /附上基础诊断/ }));
    link = screen.getByRole("link", { name: "前往 GitHub 检查并提交" });
    const body = new URL(link.getAttribute("href") ?? "").searchParams.get("body");
    expect(body).toContain("abcdef12");
    expect(screen.getByText(/公开 Issue/)).toBeTruthy();
  });
  it("reports unavailable consent storage instead of falsely confirming a saved choice", () => {
    render(<WorkbenchHelp {...props} onConsentChange={() => false} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /匿名使用统计/ }));
    expect(screen.getByRole("alert").textContent).toContain("无法保存");
    expect(screen.getByRole("checkbox", { name: /匿名使用统计/ })).toHaveProperty("checked", false);
  });
});
