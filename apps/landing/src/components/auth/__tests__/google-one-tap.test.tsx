// @vitest-environment jsdom
import * as matchers from "@testing-library/jest-dom/matchers";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoogleOneTap } from "../google-one-tap";

expect.extend(matchers);

describe("GoogleOneTap", () => {
  it("renders nothing until the selected provider has the required client config", () => {
    const { container } = render(
      <GoogleOneTap appUrl="https://app.nebutra.com" authProvider="better-auth" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a provider other than better-auth", () => {
    const { container } = render(
      <GoogleOneTap
        appUrl="https://app.nebutra.com"
        authProvider="dev"
        clientId="client.apps.googleusercontent.com"
        enabled
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("uses Better Auth's one-tap client against the app auth base URL", () => {
    render(
      <GoogleOneTap
        appUrl="https://app.nebutra.com"
        authProvider="better-auth"
        clientId="client.apps.googleusercontent.com"
        enabled
      />,
    );

    const bridge = screen.getByTestId("better-auth-google-one-tap");
    expect(bridge).toHaveAttribute("data-auth-base-url", "https://app.nebutra.com/api/auth");
    expect(bridge).toHaveAttribute("data-callback-url", "https://app.nebutra.com/workspace");
    expect(bridge).toHaveAttribute("data-state-cookie-domain", "nebutra.com");
  });

  it("does not guess a shared cookie domain for preview hosts", () => {
    render(
      <GoogleOneTap
        appUrl="https://nebutra-sailor.vercel.app"
        authProvider="better-auth"
        clientId="client.apps.googleusercontent.com"
        enabled
      />,
    );

    expect(screen.getByTestId("better-auth-google-one-tap")).not.toHaveAttribute(
      "data-state-cookie-domain",
    );
  });
});
