// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @nebutra/ui/components so we don't transitively import @emoji-mart/data
// (which Vitest cannot import without a "type: json" attribute) via the heroui
// barrel. The Button stub mirrors the props this component actually uses.
vi.mock("@nebutra/ui/components", () => ({
  Button: ({
    children,
    htmlType = "button",
    onClick,
    disabled,
  }: {
    children: ReactNode;
    htmlType?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
    disabled?: boolean;
  }) => (
    <button type={htmlType} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

import {
  type ActiveSession,
  ActiveSessionsBlock,
  formatRelativeTime,
} from "../active-sessions-block";
import type { SecurityCapabilities } from "../security-capabilities";

const capability: SecurityCapabilities["activeSessions"] = {
  available: true,
  reason: "Active sessions are managed by Nebutra through Better Auth session records.",
};

const baseSession: ActiveSession = {
  id: "sess_1",
  createdAt: "2026-05-09T10:00:00.000Z",
  updatedAt: "2026-05-09T10:00:00.000Z",
  expiresAt: "2026-05-16T10:00:00.000Z",
  ipAddress: "10.0.0.1",
  userAgent: "Mozilla/5.0 (Macintosh)",
};

function makeSession(overrides: Partial<ActiveSession>): ActiveSession {
  return { ...baseSession, ...overrides };
}

describe("formatRelativeTime", () => {
  it("returns minutes-ago for recent timestamps", () => {
    const now = new Date("2026-05-09T12:00:00.000Z").getTime();
    const ts = new Date(now - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ts, now)).toBe("5 minutes ago");
  });

  it("returns hours-ago when older than 60 minutes", () => {
    const now = new Date("2026-05-09T12:00:00.000Z").getTime();
    const ts = new Date(now - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ts, now)).toBe("3 hours ago");
  });

  it("returns days-ago when older than 24 hours", () => {
    const now = new Date("2026-05-09T12:00:00.000Z").getTime();
    const ts = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ts, now)).toBe("4 days ago");
  });

  it("returns absolute date for older than 7 days", () => {
    const now = new Date("2026-05-09T12:00:00.000Z").getTime();
    const ts = new Date("2026-03-05T14:32:00.000Z").toISOString();
    const result = formatRelativeTime(ts, now);
    expect(result).toMatch(/Mar/);
    expect(result).not.toContain("ago");
  });

  it("returns 'just now' for sub-minute deltas", () => {
    const now = new Date("2026-05-09T12:00:00.000Z").getTime();
    const ts = new Date(now - 5 * 1000).toISOString();
    expect(formatRelativeTime(ts, now)).toBe("just now");
  });

  it("returns Unknown time for invalid input", () => {
    expect(formatRelativeTime("not-a-date")).toBe("Unknown time");
  });
});

describe("ActiveSessionsBlock", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders sessions with ip, user-agent, and last-active text", () => {
    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[
          makeSession({ id: "sess_1", ipAddress: "203.0.113.5" }),
          makeSession({ id: "sess_2", ipAddress: "203.0.113.9", userAgent: "iPhone Safari" }),
        ]}
        onRefresh={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByText("203.0.113.5")).toBeDefined();
    expect(screen.getByText("203.0.113.9")).toBeDefined();
    expect(screen.getByText("iPhone Safari")).toBeDefined();
    expect(screen.getAllByText(/Last active:/i).length).toBeGreaterThanOrEqual(2);
  });

  it("marks the current session and disables its revoke button", () => {
    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[
          makeSession({ id: "sess_current", ipAddress: "1.1.1.1" }),
          makeSession({ id: "sess_other", ipAddress: "2.2.2.2" }),
        ]}
        currentSessionId="sess_current"
        onRefresh={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByText("(current)")).toBeDefined();
    const buttons = screen.getAllByRole("button", { name: /sign out/i });
    // Find the disabled one — current session
    const disabled = buttons.find((b) => (b as HTMLButtonElement).disabled);
    expect(disabled).toBeDefined();
  });

  it("shows empty state when there are no sessions", () => {
    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[]}
        onRefresh={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByText("No other active sessions.")).toBeDefined();
  });

  it("shows empty state when only the current session is present", () => {
    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[makeSession({ id: "sess_current" })]}
        currentSessionId="sess_current"
        onRefresh={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByText("No other active sessions.")).toBeDefined();
  });

  it("hides the 'Sign out of all other devices' button when fewer than 2 sessions", () => {
    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[makeSession({ id: "sess_1" })]}
        onRefresh={vi.fn(async () => {})}
      />,
    );

    expect(screen.queryByText("Sign out of all other devices")).toBeNull();
  });

  it("shows the 'Sign out of all other devices' button when 2+ sessions", () => {
    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[makeSession({ id: "sess_1" }), makeSession({ id: "sess_2" })]}
        onRefresh={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByText("Sign out of all other devices")).toBeDefined();
  });

  it("calls onRevoke and onRefresh when a row revoke button is clicked", async () => {
    const onRevoke = vi.fn(async () => {});
    const onRefresh = vi.fn(async () => {});

    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[makeSession({ id: "sess_target", ipAddress: "9.9.9.9" })]}
        onRefresh={onRefresh}
        onRevoke={onRevoke}
      />,
    );

    const button = screen.getByRole("button", { name: /sign out/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(onRevoke).toHaveBeenCalledWith("sess_target");
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it("reveals confirm step on revoke-all-others, fires callback on confirm", async () => {
    const onRevokeAllOthers = vi.fn(async () => {});
    const onRefresh = vi.fn(async () => {});

    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[makeSession({ id: "sess_1" }), makeSession({ id: "sess_2" })]}
        currentSessionId="sess_1"
        onRefresh={onRefresh}
        onRevokeAllOthers={onRevokeAllOthers}
      />,
    );

    const trigger = screen.getByText("Sign out of all other devices");
    await act(async () => {
      fireEvent.click(trigger);
    });

    expect(screen.getByText(/are you sure/i)).toBeDefined();

    const confirm = screen.getByRole("button", { name: /confirm/i });
    await act(async () => {
      fireEvent.click(confirm);
    });

    expect(onRevokeAllOthers).toHaveBeenCalled();
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it("cancels the revoke-all-others confirm step without firing the callback", async () => {
    const onRevokeAllOthers = vi.fn(async () => {});

    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[makeSession({ id: "sess_1" }), makeSession({ id: "sess_2" })]}
        onRefresh={vi.fn(async () => {})}
        onRevokeAllOthers={onRevokeAllOthers}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Sign out of all other devices"));
    });

    expect(screen.getByText(/are you sure/i)).toBeDefined();

    const cancel = screen.getByRole("button", { name: /cancel/i });
    await act(async () => {
      fireEvent.click(cancel);
    });

    expect(onRevokeAllOthers).not.toHaveBeenCalled();
    expect(screen.queryByText(/are you sure/i)).toBeNull();
  });

  it("renders mapped i18n error message from error catalog when onRevoke throws", async () => {
    const onRevoke = vi.fn(async () => {
      throw { code: "RATE_LIMITED" };
    });

    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[makeSession({ id: "sess_1" })]}
        onRefresh={vi.fn(async () => {})}
        onRevoke={onRevoke}
      />,
    );

    const button = screen.getByRole("button", { name: /sign out/i });
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText("You're doing that too often. Slow down.")).toBeDefined();
    });
  });

  it("shows success message after revoke and clears it after the timer", async () => {
    vi.useFakeTimers();
    const onRevoke = vi.fn(async () => {});

    render(
      <ActiveSessionsBlock
        capability={capability}
        sessions={[makeSession({ id: "sess_1" })]}
        onRefresh={vi.fn(async () => {})}
        onRevoke={onRevoke}
      />,
    );

    const button = screen.getByRole("button", { name: /sign out/i });

    await act(async () => {
      fireEvent.click(button);
      // flush promise microtasks
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("Session signed out.")).toBeDefined();

    await act(async () => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByText("Session signed out.")).toBeNull();
  });
});
