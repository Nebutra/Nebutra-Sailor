// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieBanner } from "./CookieBanner";

describe("CookieBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the first-visit banner concise", () => {
    render(<CookieBanner persistToServer={false} show />);

    const banner = screen.getByRole("dialog", { name: /privacy choices/i });

    expect(within(banner).getByRole("button", { name: /accept all/i })).toBeTruthy();
    expect(within(banner).getByRole("button", { name: /only necessary/i })).toBeTruthy();
    expect(within(banner).getByRole("button", { name: /manage choices/i })).toBeTruthy();
    expect(within(banner).queryByText(/strictly necessary/i)).toBeNull();
    expect(within(banner).queryByText(/^analytics$/i)).toBeNull();
    expect(within(banner).queryByText(/^marketing$/i)).toBeNull();
  });

  it("uses one optional-cookies switch instead of category cards", () => {
    render(<CookieBanner persistToServer={false} show />);

    fireEvent.click(screen.getByRole("button", { name: /manage choices/i }));

    const banner = screen.getByRole("dialog", { name: /privacy choices/i });
    expect(within(banner).getByRole("switch", { name: /optional cookies/i })).toBeTruthy();
    expect(within(banner).getByRole("button", { name: /save choices/i })).toBeTruthy();
    expect(within(banner).queryByText(/^functional$/i)).toBeNull();
    expect(within(banner).queryByText(/^analytics$/i)).toBeNull();
    expect(within(banner).queryByText(/^marketing$/i)).toBeNull();
    expect(within(banner).queryByText(/^third-party$/i)).toBeNull();
  });
});
