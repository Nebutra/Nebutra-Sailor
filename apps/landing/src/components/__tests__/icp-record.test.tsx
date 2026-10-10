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

import { IcpRecord } from "../icp-record";

const ICP = "苏ICP备2026020707号-1";

describe("IcpRecord", () => {
  afterEach(() => {
    cleanup();
  });

  it("links the ICP number to the MIIT register", () => {
    render(<IcpRecord icpNumber={ICP} />);
    const link = screen.getByText(ICP);
    expect(link).toHaveAttribute("href", "https://beian.miit.gov.cn/");
    expect(link).toHaveAttribute("aria-label", "ICP 备案号");
  });

  it("renders nothing without a number", () => {
    const { container } = render(<IcpRecord icpNumber="  " />);
    expect(container).toBeEmptyDOMElement();
  });

  it("adds the 公安备案 link when one is set", () => {
    render(<IcpRecord icpNumber={ICP} publicSecurityRecord="苏公网安备32021102000000号" />);
    expect(screen.getByText("公安备案 苏公网安备32021102000000号")).toHaveAttribute(
      "href",
      "https://beian.mps.gov.cn/",
    );
  });
});
