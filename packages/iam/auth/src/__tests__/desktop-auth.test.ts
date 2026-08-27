import { describe, expect, it, vi } from "vitest";
import {
  buildDesktopAuthStartUrl,
  consumeDesktopAuthHandoff,
  type DesktopAuthExecuteRawClient,
  type DesktopAuthQueryRawClient,
  type DesktopAuthTransactionClient,
  issueDesktopAuthHandoff,
  parseDesktopAuthRequest,
  resolveDesktopSession,
} from "../desktop-auth";

function sqlText(query: unknown): string {
  if (query && typeof query === "object" && "strings" in query) {
    return Array.from((query as { strings: readonly string[] }).strings).join("?");
  }
  return String(query);
}

describe("desktop auth protocol", () => {
  it("builds a localized sign-up redirect with an internal desktop completion returnUrl", () => {
    const request = new Request(
      "https://app.nebutra.com/signup/remote?scheme=foundry&state=f80fe991-f260-468a-b9fc-9a9b98bf9352&public_beta=true",
    );

    const target = buildDesktopAuthStartUrl(request, "sign-up");

    expect(target.pathname).toBe("/en/sign-up");
    const returnUrl = target.searchParams.get("returnUrl");
    expect(returnUrl).toBe(
      "/en/desktop-auth/complete?scheme=foundry&state=f80fe991-f260-468a-b9fc-9a9b98bf9352&mode=sign-up&public_beta=true",
    );
  });

  it("accepts Foundry OSS desktop auth requests and preserves the custom URL scheme", () => {
    const request = new Request(
      "https://app.nebutra.com/signup/remote?scheme=foundryoss&state=f80fe991-f260-468a-b9fc-9a9b98bf9352&public_beta=true",
    );

    const parsed = parseDesktopAuthRequest(request);
    const target = buildDesktopAuthStartUrl(request, "sign-up");

    expect(parsed).toEqual({
      ok: true,
      scheme: "foundryoss",
      state: "f80fe991-f260-468a-b9fc-9a9b98bf9352",
      publicBeta: true,
    });
    expect(target.pathname).toBe("/en/sign-up");
    expect(target.searchParams.get("returnUrl")).toBe(
      "/en/desktop-auth/complete?scheme=foundryoss&state=f80fe991-f260-468a-b9fc-9a9b98bf9352&mode=sign-up&public_beta=true",
    );
  });

  it("rejects unsupported desktop schemes before constructing a returnUrl", () => {
    const request = new Request(
      "https://app.nebutra.com/signup/remote?scheme=javascript&state=f80fe991-f260-468a-b9fc-9a9b98bf9352",
    );

    const parsed = parseDesktopAuthRequest(request);
    const target = buildDesktopAuthStartUrl(request, "sign-up");

    expect(parsed.ok).toBe(false);
    expect(target.pathname).toBe("/en/sign-up");
    expect(target.searchParams.get("error")).toBe("invalid_desktop_auth_request");
    expect(target.searchParams.has("returnUrl")).toBe(false);
  });

  it("exchanges a handoff token exactly once and creates a bearer desktop session", async () => {
    const executeRaw = vi.fn();
    const queryRaw = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "handoff_1",
          user_id: "user_1",
          scheme: "foundry",
          state: "f80fe991-f260-468a-b9fc-9a9b98bf9352",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "user_1",
          email: "ada@example.com",
          name: "Ada Lovelace",
          image: null,
        },
      ]);
    const tx = {
      $executeRaw: executeRaw,
      $queryRaw: queryRaw,
    } as unknown as DesktopAuthQueryRawClient;
    const db = {
      $transaction: vi.fn(
        async <T>(fn: (client: DesktopAuthQueryRawClient) => T | Promise<T>): Promise<T> => fn(tx),
      ),
    } as unknown as DesktopAuthTransactionClient;

    const handoff = await issueDesktopAuthHandoff({
      client: { $executeRaw: executeRaw } as unknown as DesktopAuthExecuteRawClient,
      userId: "user_1",
      scheme: "foundry",
      state: "f80fe991-f260-468a-b9fc-9a9b98bf9352",
      request: new Request("https://app.nebutra.com/en/desktop-auth/complete"),
      now: new Date("2026-06-04T00:00:00.000Z"),
    });
    const result = await consumeDesktopAuthHandoff({
      client: db,
      token: handoff.token,
      request: new Request("https://app.nebutra.com/api/auth/desktop/exchange"),
      now: new Date("2026-06-04T00:00:10.000Z"),
    });

    expect(handoff.token).toMatch(/^ndh_[A-Za-z0-9_-]{40,}$/);
    expect(result?.accessToken).toMatch(/^nds_[A-Za-z0-9_-]{40,}$/);
    expect(result?.user).toEqual({
      id: "user_1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      imageUrl: null,
    });
    expect(sqlText(queryRaw.mock.calls[0]?.[0])).toContain('"consumed_at" IS NULL');
    expect(sqlText(queryRaw.mock.calls[0]?.[0])).toContain('"expires_at" >');
  });

  it("resolves a valid bearer desktop session and rejects missing authorization", async () => {
    const executeRaw = vi.fn();
    const queryRaw = vi.fn().mockResolvedValueOnce([
      {
        session_id: "session_1",
        user_id: "user_1",
        scheme: "foundry",
        expires_at: new Date("2026-07-04T00:00:00.000Z"),
        id: "user_1",
        email: "ada@example.com",
        name: "Ada Lovelace",
        image: null,
      },
    ]);
    const client = {
      $executeRaw: executeRaw,
      $queryRaw: queryRaw,
    } as unknown as DesktopAuthQueryRawClient;

    await expect(
      resolveDesktopSession({
        client,
        request: new Request("https://app.nebutra.com/api/auth/desktop/me"),
      }),
    ).resolves.toBeNull();

    await expect(
      resolveDesktopSession({
        client,
        request: new Request("https://app.nebutra.com/api/auth/desktop/me", {
          headers: { authorization: "Bearer nds_test_token" },
        }),
      }),
    ).resolves.toMatchObject({
      sessionId: "session_1",
      user: { id: "user_1", email: "ada@example.com", name: "Ada Lovelace" },
    });
    expect(executeRaw).toHaveBeenCalledOnce();
  });
});
