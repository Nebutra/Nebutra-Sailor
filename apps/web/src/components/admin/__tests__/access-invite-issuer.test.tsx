// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessInviteIssuer } from "../access-invite-issuer";

describe("AccessInviteIssuer", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("issues invite codes and displays plaintext once", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          invites: [
            {
              id: "aic_1",
              attributionStatus: "dub",
              canonicalInviteUrl: "https://app.example/sign-up?invite=neb_abc123",
              code: "neb_abc123",
              emailStatus: "sent",
              inviteUrl: "https://app.example/sign-up?invite=neb_abc123",
              prefix: "neb_abc123",
              scope: "platform",
              tenantId: null,
              expiresAt: null,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AccessInviteIssuer />);

    await user.clear(screen.getByLabelText("Count"));
    await user.type(screen.getByLabelText("Count"), "1");
    await user.type(screen.getByLabelText("Email lock"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Issue invite codes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/access-invites",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          count: 1,
          scope: "platform",
          issuedToEmail: "ada@example.com",
        }),
      }),
    );
    expect(await screen.findByText("neb_abc123")).toBeInTheDocument();
    expect(screen.getByText("https://app.example/sign-up?invite=neb_abc123")).toBeInTheDocument();
    expect(screen.getByText(/email sent/i)).toBeInTheDocument();
    expect(screen.getByText(/tracked link/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Copy these codes now");
  });
});
