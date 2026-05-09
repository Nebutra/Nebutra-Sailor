// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string, vars?: Record<string, unknown>) => {
    const full = `${namespace}.${key}`;
    if (vars) {
      return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), full);
    }
    return full;
  },
}));

import { AuditLogTable } from "../audit-log-table";

const sampleLog = {
  id: "log_1",
  organizationId: "org_1",
  userId: "user_1",
  actorType: "user",
  action: "user.login",
  outcome: "success" as const,
  reason: null,
  entityType: "session",
  entityId: "sess_1",
  oldValue: null,
  newValue: { foo: "bar" },
  ipAddress: "1.1.1.1",
  userAgent: "Mozilla/5.0",
  metadata: {},
  createdAt: "2026-05-01T12:00:00.000Z",
};

describe("AuditLogTable", () => {
  afterEach(() => cleanup());

  it("renders an empty state when no logs are provided", () => {
    render(<AuditLogTable logs={[]} isLoading={false} />);
    expect(screen.getByTestId("audit-empty")).toBeInTheDocument();
  });

  it("renders a loading skeleton when isLoading is true", () => {
    render(<AuditLogTable logs={[]} isLoading />);
    expect(screen.getByTestId("audit-skeleton")).toBeInTheDocument();
  });

  it("renders rows with action, entity, and outcome pill", () => {
    render(<AuditLogTable logs={[sampleLog]} isLoading={false} />);
    expect(screen.getByText("user.login")).toBeInTheDocument();
    expect(screen.getByText("session")).toBeInTheDocument();
    const pill = screen.getByTestId(`outcome-pill-${sampleLog.id}`);
    expect(pill).toHaveTextContent(/success/i);
  });

  it("expands a row to show oldValue/newValue diff when clicked", () => {
    render(<AuditLogTable logs={[sampleLog]} isLoading={false} />);

    // Initially the diff panel is not in the DOM
    expect(screen.queryByTestId(`audit-diff-${sampleLog.id}`)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`audit-row-${sampleLog.id}`));

    expect(screen.getByTestId(`audit-diff-${sampleLog.id}`)).toBeInTheDocument();
    // newValue JSON should be visible
    expect(screen.getByTestId(`audit-diff-${sampleLog.id}`).textContent).toContain("foo");
  });
});
