import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ getAuthenticatedApi: vi.fn() }));

import { orderState } from "../order-history";

describe("order history", () => {
  it("reads a paid order that has not been handed over as still crediting", () => {
    expect(orderState({ status: "PAID", fulfilled: false })).toBe("CREDITING");
    expect(orderState({ status: "PAID", fulfilled: true })).toBe("PAID");
    expect(orderState({ status: "EXPIRED", fulfilled: false })).toBe("EXPIRED");
  });
});
