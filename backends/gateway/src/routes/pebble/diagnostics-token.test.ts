import { describe, expect, it } from "vitest";
import { deriveUploadUrl, resolvePublicTokenEndpoint } from "./diagnostics-token.js";

describe("resolvePublicTokenEndpoint / deriveUploadUrl", () => {
  it("maps CF origin host to api.nebutra.com and forces https", () => {
    const upload = deriveUploadUrl("http://origin.nebutra.com/pebble/diagnostics/token", {
      forwardedHost: "origin.nebutra.com",
      forwardedProto: "http",
    });
    expect(upload).toBe("https://api.nebutra.com/pebble/diagnostics/upload");
  });

  it("prefers X-Forwarded-Host when CF presents origin internally", () => {
    const upload = deriveUploadUrl("http://origin.nebutra.com/pebble/diagnostics/token", {
      forwardedHost: "api.nebutra.com",
      forwardedProto: "https",
    });
    expect(upload).toBe("https://api.nebutra.com/pebble/diagnostics/upload");
  });

  it("keeps brand host path without /pebble when X-Original-URI is set", () => {
    const upload = deriveUploadUrl("http://127.0.0.1:3002/pebble/diagnostics/token", {
      forwardedHost: "pebble.nebutra.com",
      forwardedProto: "https",
      originalUri: "/diagnostics/token",
    });
    expect(upload).toBe("https://pebble.nebutra.com/diagnostics/upload");
  });

  it("strips /pebble for brand host when only gateway path is known", () => {
    const upload = deriveUploadUrl("http://127.0.0.1:3002/pebble/diagnostics/token", {
      forwardedHost: "pebble.nebutra.com",
      forwardedProto: "https",
    });
    expect(upload).toBe("https://pebble.nebutra.com/diagnostics/upload");
  });

  it("preserves localhost http for local tests", () => {
    const upload = deriveUploadUrl("http://localhost/pebble/diagnostics/token");
    expect(upload).toBe("http://localhost/pebble/diagnostics/upload");
  });

  it("resolvePublicTokenEndpoint exposes the client-facing token URL", () => {
    const token = resolvePublicTokenEndpoint({
      requestUrl: "http://origin.nebutra.com/pebble/diagnostics/token",
      forwardedHost: "api.nebutra.com",
      forwardedProto: "https",
    });
    expect(token.toString()).toBe("https://api.nebutra.com/pebble/diagnostics/token");
  });
});
