import { describe, expect, it } from "vitest";
import { applyEdgeAuthCors, isFirstPartyAuthOrigin } from "./auth-edge-cors";

describe("isFirstPartyAuthOrigin", () => {
  it("allows product hosts that share the session cookie", () => {
    expect(isFirstPartyAuthOrigin("https://forge.nebutra.com")).toBe(true);
    expect(isFirstPartyAuthOrigin("https://router.nebutra.com")).toBe(true);
    expect(isFirstPartyAuthOrigin("https://app.nebutra.com")).toBe(true);
    expect(isFirstPartyAuthOrigin("https://nebutra.com")).toBe(true);
    expect(isFirstPartyAuthOrigin("http://localhost:3105")).toBe(true);
  });

  it("rejects third-party origins", () => {
    expect(isFirstPartyAuthOrigin("https://evil.example")).toBe(false);
    expect(isFirstPartyAuthOrigin("https://nebutra.com.attacker")).toBe(false);
    expect(isFirstPartyAuthOrigin("not-a-url")).toBe(false);
  });
});

describe("applyEdgeAuthCors", () => {
  it("puts ACAO on GET get-session for forge so the browser can read the body", () => {
    const request = new Request("https://auth.nebutra.com/api/auth/get-session", {
      headers: { Origin: "https://forge.nebutra.com" },
    });
    const out = applyEdgeAuthCors(request, new Response("null", { status: 200 }));
    expect(out.headers.get("Access-Control-Allow-Origin")).toBe("https://forge.nebutra.com");
    expect(out.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("does not reflect an untrusted Origin with credentials", () => {
    const request = new Request("https://auth.nebutra.com/api/auth/get-session", {
      headers: { Origin: "https://evil.example" },
    });
    const out = applyEdgeAuthCors(
      request,
      new Response("null", {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "https://evil.example",
          "Access-Control-Allow-Credentials": "true",
        },
      }),
    );
    expect(out.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(out.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });

  it("keeps Set-Cookie so a credentialed sign-out can clear the session", () => {
    const request = new Request("https://auth.nebutra.com/api/auth/sign-out", {
      method: "POST",
      headers: { Origin: "https://forge.nebutra.com" },
    });
    const out = applyEdgeAuthCors(
      request,
      new Response(null, {
        status: 200,
        headers: {
          "Set-Cookie": "better-auth.session_token=; Max-Age=0; Path=/; Domain=.nebutra.com",
        },
      }),
    );
    const cookies =
      typeof out.headers.getSetCookie === "function"
        ? out.headers.getSetCookie()
        : [out.headers.get("Set-Cookie")];
    expect(cookies.some((cookie) => cookie?.includes("session_token"))).toBe(true);
    expect(out.headers.get("Access-Control-Allow-Origin")).toBe("https://forge.nebutra.com");
  });

  it("answers OPTIONS for forge with 204 and first-party ACAO", () => {
    const request = new Request("https://auth.nebutra.com/api/auth/get-session", {
      method: "OPTIONS",
      headers: { Origin: "https://forge.nebutra.com" },
    });
    const out = applyEdgeAuthCors(request, new Response(null, { status: 200 }));
    expect(out.status).toBe(204);
    expect(out.headers.get("Access-Control-Allow-Origin")).toBe("https://forge.nebutra.com");
    expect(out.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });
});
