import { describe, expect, it } from "vitest";
import {
  describeCallbackHint,
  findLoginRow,
  isSettled,
  looksLikeCallback,
  needsInput,
} from "../login-flow";

describe("describeCallbackHint", () => {
  it("names the callback host the browser will land on", () => {
    expect(describeCallbackHint("localhost:1455")).toContain("http://localhost:1455/");
  });
  it("normalises a scheme or trailing slash", () => {
    expect(describeCallbackHint("http://localhost:54545/")).toContain("http://localhost:54545/");
  });
  it("falls back to localhost when the host is blank", () => {
    expect(describeCallbackHint("")).toContain("http://localhost/");
  });
});

describe("looksLikeCallback", () => {
  it("accepts the provider redirect with a state on the expected host", () => {
    expect(
      looksLikeCallback("http://localhost:1455/auth/callback?code=x&state=s1", "localhost:1455"),
    ).toBe(true);
  });
  it("rejects another host, a missing state, or non-URLs", () => {
    expect(looksLikeCallback("http://localhost:9999/cb?state=s1", "localhost:1455")).toBe(false);
    expect(looksLikeCallback("http://localhost:1455/cb?code=x", "localhost:1455")).toBe(false);
    expect(looksLikeCallback("not a url", "localhost:1455")).toBe(false);
  });
});

describe("login rows", () => {
  it("finds the flow by state and settles only on ok/error", () => {
    const items = [
      { id: "s1", status: "wait" },
      { id: "s2", status: "ok" },
    ];
    expect(findLoginRow(items, "s2")?.status).toBe("ok");
    expect(findLoginRow(items, "s3")).toBeNull();
    expect(isSettled("wait")).toBe(false);
    expect(isSettled("unknown")).toBe(false);
    expect(isSettled("ok")).toBe(true);
    expect(isSettled("error")).toBe(true);
  });
});

describe("needsInput", () => {
  it("is true only for actions with a required input", () => {
    expect(needsInput({ input: { type: "object", required: ["provider"] } })).toBe(true);
    expect(needsInput({ input: { type: "object", required: [] } })).toBe(false);
    expect(needsInput({})).toBe(false);
  });
});
