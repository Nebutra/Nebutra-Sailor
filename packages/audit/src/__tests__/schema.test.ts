import { describe, expect, it } from "vitest";
import { ACTIONS, ActionSchema, AuditEventSchema, defineAction } from "../schema";

describe("ActionSchema", () => {
  it("accepts dotted lowercase action names", () => {
    expect(() => ActionSchema.parse("auth.login.success")).not.toThrow();
    expect(() => ActionSchema.parse("billing.subscription.created")).not.toThrow();
  });

  it("rejects single-segment names", () => {
    expect(() => ActionSchema.parse("login")).toThrow();
  });

  it("rejects uppercase or invalid characters", () => {
    expect(() => ActionSchema.parse("Auth.login.success")).toThrow();
    expect(() => ActionSchema.parse("auth.login!")).toThrow();
  });
});

describe("AuditEventSchema", () => {
  const baseEvent = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    timestamp: "2026-05-10T12:00:00.000Z",
    actor: { id: "user_1", type: "user" as const },
    tenantId: "org_1",
    action: "auth.login.success",
    resource: { type: "session", id: "sess_1" },
    outcome: "success" as const,
    severity: "info" as const,
    context: {},
  };

  it("accepts a fully-formed valid event", () => {
    const parsed = AuditEventSchema.parse(baseEvent);
    expect(parsed.id).toBe(baseEvent.id);
  });

  it("rejects events with malformed UUIDs", () => {
    expect(() => AuditEventSchema.parse({ ...baseEvent, id: "not-a-uuid" })).toThrow();
  });

  it("rejects events with invalid action", () => {
    expect(() => AuditEventSchema.parse({ ...baseEvent, action: "INVALID" })).toThrow();
  });

  it("rejects events without tenantId", () => {
    const { tenantId: _omit, ...rest } = baseEvent;
    expect(() => AuditEventSchema.parse(rest)).toThrow();
  });

  it("rejects unknown outcome values", () => {
    expect(() => AuditEventSchema.parse({ ...baseEvent, outcome: "weird" })).toThrow();
  });

  it("accepts events with optional changes block", () => {
    const event = {
      ...baseEvent,
      changes: { before: { role: "member" }, after: { role: "admin" } },
    };
    expect(() => AuditEventSchema.parse(event)).not.toThrow();
  });
});

describe("defineAction", () => {
  it("validates the action name shape eagerly", () => {
    expect(() => defineAction("not_dotted")).toThrow();
  });

  it("returns the action name and metadata schema", () => {
    const action = defineAction("test.action.created");
    expect(action.name).toBe("test.action.created");
  });
});

describe("ACTIONS catalog", () => {
  it("exposes well-known action names", () => {
    expect(ACTIONS.AUTH_LOGIN_SUCCESS.name).toBe("auth.login.success");
    expect(ACTIONS.API_KEY_CREATED.name).toBe("api_key.created");
    expect(ACTIONS.BILLING_CHECKOUT_STARTED.name).toBe("billing.checkout.started");
  });
});
