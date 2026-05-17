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

  it("uses the Google Identity Services HTML API with an app-domain login endpoint", () => {
    render(
      <GoogleOneTap
        appUrl="https://app.nebutra.com"
        authProvider="nextauth"
        clientId="client.apps.googleusercontent.com"
        enabled
      />,
    );

    const onload = screen.getByTestId("google-one-tap-onload");
    expect(onload).toHaveAttribute("data-client_id", "client.apps.googleusercontent.com");
    expect(onload).toHaveAttribute(
      "data-login_uri",
      "https://app.nebutra.com/api/auth/google-one-tap",
    );
    expect(onload).toHaveAttribute("data-auto_prompt", "true");
    expect(onload).toHaveAttribute("data-state_cookie_domain", "nebutra.com");
  });

  it("does not guess a shared cookie domain for preview hosts", () => {
    render(
      <GoogleOneTap
        appUrl="https://nebutra-sailor.vercel.app"
        authProvider="nextauth"
        clientId="client.apps.googleusercontent.com"
        enabled
      />,
    );

    expect(screen.getByTestId("google-one-tap-onload")).not.toHaveAttribute(
      "data-state_cookie_domain",
    );
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
    expect(bridge).toHaveAttribute("data-callback-url", "https://app.nebutra.com/dashboard");
    expect(bridge).toHaveAttribute("data-state-cookie-domain", "nebutra.com");
  });

  it("uses Clerk's official GoogleOneTap component when Clerk is selected", () => {
    render(
      <GoogleOneTap
        appUrl="https://app.nebutra.com"
        authProvider="clerk"
        clerkPublishableKey="pk_test_123"
        enabled
      />,
    );

    const bridge = screen.getByTestId("clerk-google-one-tap");
    expect(bridge).toHaveAttribute("data-dashboard-url", "https://app.nebutra.com/dashboard");
    expect(bridge).toHaveAttribute("data-publishable-key", "pk_test_123");
  });
});
