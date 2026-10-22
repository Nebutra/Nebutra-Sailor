// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorkbenchEmpty } from "./workbench-empty";

afterEach(cleanup);
const props = () => ({
  dataLoading: false,
  shortcutLoading: false,
  dataError: null,
  shortcutError: "",
  chartReady: true,
  hasSelection: false,
  shortcuts: [{ id: "cn" as const, label: "A 股 · 贵州茅台" }],
  onSelect: vi.fn(),
  onCancel: vi.fn(),
  onRetry: vi.fn(),
  onHelp: vi.fn(),
});
it("uses shortcuts only before a selection and preserves the help focus target", () => {
  const actions = props();
  const { rerender } = render(<WorkbenchEmpty {...actions} />);
  fireEvent.click(screen.getByRole("button", { name: "A 股 · 贵州茅台" }));
  expect(actions.onSelect).toHaveBeenCalledWith("cn");
  const help = screen.getByRole("button", { name: "如何开始研究" });
  fireEvent.click(help);
  expect(actions.onHelp).toHaveBeenCalledWith(help);
  rerender(<WorkbenchEmpty {...actions} hasSelection dataError="连接失败" />);
  expect(screen.queryByRole("button", { name: "A 股 · 贵州茅台" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "重新加载行情" }));
  expect(actions.onRetry).toHaveBeenCalledOnce();
});
it("offers cancellation during catalog lookup without duplicating market controls", () => {
  const actions = props();
  render(<WorkbenchEmpty {...actions} shortcutLoading />);
  expect(screen.queryByRole("button", { name: "A 股 · 贵州茅台" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "取消搜索" }));
  expect(actions.onCancel).toHaveBeenCalledOnce();
});
