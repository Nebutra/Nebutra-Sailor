// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  "compliance.wechat.signIn": "Sign in with WeChat",
  "compliance.wechat.notConfigured": "WeChat login not configured",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

const { isChinaRegionMock } = vi.hoisted(() => ({
  isChinaRegionMock: vi.fn<() => boolean>(() => false),
}));

vi.mock("@nebutra/china-compliance", async () => {
  const actual = await vi.importActual<typeof import("@nebutra/china-compliance")>(
    "@nebutra/china-compliance",
  );
  return {
    ...actual,
    isChinaRegion: isChinaRegionMock,
  };
});

import { WeChatLoginButton } from "../wechat-login-button";

describe("WeChatLoginButton", () => {
  beforeEach(() => {
    isChinaRegionMock.mockReset();
    isChinaRegionMock.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing when not in a China region and forceVisible is unset", () => {
    isChinaRegionMock.mockReturnValue(false);
    const { container } = render(<WeChatLoginButton appId="wxabc123" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when isChinaRegion() === true and appId is set", () => {
    isChinaRegionMock.mockReturnValue(true);
    render(<WeChatLoginButton appId="wxabc123" />);
    const btn = screen.getByTestId("wechat-login-button");
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
    expect(screen.getByText("Sign in with WeChat")).toBeInTheDocument();
  });

  it("renders when forceVisible is true even outside China", () => {
    isChinaRegionMock.mockReturnValue(false);
    render(<WeChatLoginButton appId="wxabc123" forceVisible />);
    expect(screen.getByTestId("wechat-login-button")).toBeInTheDocument();
  });

  it("renders disabled with a hint when appId is missing", () => {
    isChinaRegionMock.mockReturnValue(true);
    render(<WeChatLoginButton />);
    const btn = screen.getByTestId("wechat-login-button");
    expect(btn).toBeDisabled();
    expect(screen.getByText("WeChat login not configured")).toBeInTheDocument();
  });

  it("redirects via window.location.assign on click when configured", async () => {
    isChinaRegionMock.mockReturnValue(true);

    // Spy on window.location.assign without overriding the whole location object.
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        origin: "https://app.nebutra.com",
        assign: assignSpy,
      },
    });

    const user = userEvent.setup();
    render(
      <WeChatLoginButton
        appId="wxabc123"
        redirectUri="https://app.nebutra.com/api/auth/wechat/callback"
      />,
    );

    await user.click(screen.getByTestId("wechat-login-button"));

    expect(assignSpy).toHaveBeenCalledTimes(1);
    const url = assignSpy.mock.calls[0]?.[0] as string;
    expect(url).toContain("open.weixin.qq.com");
    expect(url).toContain("appid=wxabc123");
    expect(url).toContain(encodeURIComponent("https://app.nebutra.com/api/auth/wechat/callback"));
    expect(url).toContain("#wechat_redirect");
  });

  it("does not redirect when disabled (no appId)", async () => {
    isChinaRegionMock.mockReturnValue(true);

    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, origin: "https://app.nebutra.com", assign: assignSpy },
    });

    const user = userEvent.setup();
    render(<WeChatLoginButton />);

    await user.click(screen.getByTestId("wechat-login-button"));
    expect(assignSpy).not.toHaveBeenCalled();
  });
});
