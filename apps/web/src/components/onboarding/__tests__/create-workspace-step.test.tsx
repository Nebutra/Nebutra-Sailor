// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) =>
    (key: string): string =>
      `${namespace}.${key}`,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@nebutra/brand/metadata", () => ({
  brand: { domains: { app: "app.example.com" } },
}));

vi.mock("@nebutra/ui/utils", () => ({
  AUTH_PRIMARY_CTA_CLASS: "",
}));

vi.mock("@nebutra/ui/primitives", () => ({
  Button: ({
    children,
    type = "button",
    disabled,
  }: {
    children: ReactNode;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  }) => (
    <button type={type} disabled={disabled}>
      {children}
    </button>
  ),
  Form: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FormField: ({
    render,
  }: {
    render: (props: {
      field: { name: string; value: string; onChange: () => void; onBlur: () => void };
    }) => ReactNode;
  }) =>
    render({
      field: { name: "name", value: "", onChange: vi.fn(), onBlur: vi.fn() },
    }),
  FormItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  FormControl: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FormMessage: () => null,
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => (
    <input aria-label={props.placeholder} placeholder={props.placeholder} />
  ),
}));

import {
  CreateWorkspaceStep,
  createWorkspaceSchema,
  resolveWorkspaceSubmitError,
} from "../create-workspace-step";

describe("CreateWorkspaceStep", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders copy from the onboarding.workspace catalog, not hardcoded English", () => {
    render(<CreateWorkspaceStep onComplete={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "onboarding.workspace.title" })).toBeInTheDocument();
    expect(screen.getByText("onboarding.workspace.description")).toBeInTheDocument();
    expect(screen.getByText("onboarding.workspace.nameLabel")).toBeInTheDocument();
    expect(screen.getByText("onboarding.workspace.urlLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "onboarding.workspace.submit" })).toBeInTheDocument();
    expect(
      screen.getByText("app.example.com/onboarding.workspace.slugPlaceholder"),
    ).toBeInTheDocument();
  });

  it("uses translated validation copy for an empty workspace name", () => {
    const schema = createWorkspaceSchema({
      nameRequired: "请输入工作空间名称。",
      slugError: "工作空间地址格式不正确。",
    });

    const result = schema.safeParse({ name: "", slug: "valid-workspace" });

    expect(result.error?.issues[0]?.message).toBe("请输入工作空间名称。");
  });

  it("maps provider errors to translated UI copy instead of exposing server English", () => {
    expect(
      resolveWorkspaceSubmitError(
        {
          code: "ORGANIZATIONS_NOT_ENABLED",
          error: "Organizations are not enabled for this provider.",
        },
        {
          error: "工作空间创建失败。",
          providerUnsupported: "当前登录方式暂不支持创建工作空间。",
        },
      ),
    ).toBe("当前登录方式暂不支持创建工作空间。");
  });

  it("uses translated generic copy for unknown API errors", () => {
    expect(
      resolveWorkspaceSubmitError(
        { error: "Internal server error" },
        {
          error: "工作空间创建失败。",
          providerUnsupported: "当前登录方式暂不支持创建工作空间。",
        },
      ),
    ).toBe("工作空间创建失败。");
  });
});
