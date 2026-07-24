/// <reference types="@testing-library/jest-dom" />
// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

const messages: Record<string, string> = {
  "compliance.icp.recordNumber": "ICP 备案号",
  "compliance.icp.publicSecurity": "公安备案",
};

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const fullKey = `${namespace}.${key}`;
    return messages[fullKey] ?? fullKey;
  },
}));

import { IcpFooter } from "../icp-footer";

describe("IcpFooter", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the ICP number when locale=zh and icpNumber is set", () => {
    render(<IcpFooter locale="zh" icpNumber="京ICP备12345678号-1" />);
    expect(screen.getByText("京ICP备12345678号-1")).toBeInTheDocument();
  });

  it("links the ICP number to beian.miit.gov.cn with rel=noopener", () => {
    render(<IcpFooter locale="zh" icpNumber="京ICP备12345678号-1" />);
    const link = screen.getByText("京ICP备12345678号-1").closest("a");
    expect(link).toHaveAttribute("href", "https://beian.miit.gov.cn");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
  });

  it("renders the public security record when provided", () => {
    render(
      <IcpFooter
        locale="zh"
        icpNumber="京ICP备12345678号-1"
        publicSecurityRecord="11010802012345"
      />,
    );
    expect(screen.getByText(/公安备案 11010802012345/)).toBeInTheDocument();
  });

  it("does NOT render the public security row when not provided", () => {
    render(<IcpFooter locale="zh" icpNumber="京ICP备12345678号-1" />);
    expect(screen.queryByText(/公安备案/)).not.toBeInTheDocument();
  });

  it("renders nothing when locale is not zh", () => {
    const { container } = render(<IcpFooter locale="en" icpNumber="京ICP备12345678号-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when icpNumber is undefined", () => {
    const { container } = render(<IcpFooter locale="zh" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when icpNumber is an empty/whitespace string", () => {
    const { container } = render(<IcpFooter locale="zh" icpNumber="   " />);
    expect(container.firstChild).toBeNull();
  });
});
