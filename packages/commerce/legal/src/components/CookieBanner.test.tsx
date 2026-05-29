// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
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
    expect(within(banner).queryByRole("button", { name: /manage choices/i })).toBeNull();
    expect(within(banner).queryByText(/strictly necessary/i)).toBeNull();
    expect(within(banner).queryByText(/^analytics$/i)).toBeNull();
    expect(within(banner).queryByText(/^marketing$/i)).toBeNull();
  });

  it("does not render preference boxes or switches", () => {
    render(<CookieBanner persistToServer={false} show />);

    const banner = screen.getByRole("dialog", { name: /privacy choices/i });
    expect(within(banner).queryByRole("switch")).toBeNull();
    expect(within(banner).queryByRole("checkbox")).toBeNull();
    expect(within(banner).queryByText(/save choices/i)).toBeNull();
    expect(within(banner).queryByText(/^functional$/i)).toBeNull();
    expect(within(banner).queryByText(/^analytics$/i)).toBeNull();
    expect(within(banner).queryByText(/^marketing$/i)).toBeNull();
    expect(within(banner).queryByText(/^third-party$/i)).toBeNull();
  });
});
