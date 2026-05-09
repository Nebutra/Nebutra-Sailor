// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));

import { DataExportCard } from "../data-export-card";

describe("DataExportCard", () => {
  beforeEach(() => {
    // no-op
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders title, description and compliance copy", () => {
    render(<DataExportCard />);
    expect(screen.getByRole("heading").textContent).toBe("account.export.title");
    expect(screen.getByText("account.export.description")).toBeTruthy();
    expect(screen.getByText("account.export.compliance")).toBeTruthy();
  });

  it("calls startExport then fetchExport and reveals a download link on success", async () => {
    const startExport = vi.fn().mockResolvedValue({
      exportId: "ex_1",
      status: "pending",
      estimatedReadyAt: new Date().toISOString(),
    });
    const fetchExport = vi.fn().mockResolvedValue({
      exportId: "ex_1",
      status: "ready",
      inline: true,
      data: { user: { id: "user_1" }, organizations: [], auditEvents: [], invitations: [] },
    });

    render(<DataExportCard startExport={startExport} fetchExport={fetchExport} />);
    fireEvent.click(screen.getByRole("button", { name: "account.export.export" }));

    await waitFor(() => expect(startExport).toHaveBeenCalled());
    await waitFor(() => {
      const anchors = document.querySelectorAll("a[download]");
      expect(anchors.length).toBe(1);
    });
    expect(fetchExport).toHaveBeenCalledWith("ex_1");

    const anchors = document.querySelectorAll("a[download]");
    expect((anchors[0] as HTMLAnchorElement).getAttribute("href") ?? "").toContain(
      "data:application/json",
    );
    // Ready status text should also appear.
    const statuses = screen.getAllByRole("status");
    expect(statuses.length).toBeGreaterThan(0);
  });

  it("uses a remote downloadUrl when payload is too large to inline", async () => {
    const startExport = vi.fn().mockResolvedValue({
      exportId: "ex_2",
      status: "pending",
      estimatedReadyAt: new Date().toISOString(),
    });
    const fetchExport = vi.fn().mockResolvedValue({
      exportId: "ex_2",
      status: "ready",
      inline: false,
      downloadUrl: "/api/account/export?id=ex_2&download=1",
    });

    render(<DataExportCard startExport={startExport} fetchExport={fetchExport} />);
    fireEvent.click(screen.getByRole("button", { name: "account.export.export" }));

    await waitFor(() => {
      const anchors = document.querySelectorAll("a[download]");
      expect(anchors.length).toBe(1);
      expect((anchors[0] as HTMLAnchorElement).getAttribute("href") ?? "").toBe(
        "/api/account/export?id=ex_2&download=1",
      );
    });
  });

  it("shows error message when startExport rejects", async () => {
    const startExport = vi.fn().mockRejectedValue(new Error("boom"));
    const fetchExport = vi.fn();

    render(<DataExportCard startExport={startExport} fetchExport={fetchExport} />);
    fireEvent.click(screen.getByRole("button", { name: "account.export.export" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("boom"));
    expect(fetchExport).not.toHaveBeenCalled();
  });
});
