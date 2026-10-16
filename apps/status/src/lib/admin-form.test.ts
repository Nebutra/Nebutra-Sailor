import { describe, expect, it } from "vitest";
import { localizedMessage, messageFieldName, nextStatus } from "./admin-form";

const reader = (fields: Record<string, string>) => (name: string) => fields[name] ?? null;

describe("localizedMessage", () => {
  it("uses the page default as the base and the rest as translations", () => {
    expect(
      localizedMessage(
        reader({
          [messageFieldName("zh-CN")]: " 正在排查 ",
          [messageFieldName("en")]: "Investigating",
        }),
        ["zh-CN", "en"],
      ),
    ).toEqual({ message: "正在排查", messageI18n: { en: "Investigating" } });
  });

  it("falls back to the first filled language when the default is empty", () => {
    expect(localizedMessage(reader({ "message:en": "Investigating" }), ["zh-CN", "en"])).toEqual({
      message: "Investigating",
    });
  });

  it("returns null when nothing was written", () => {
    expect(localizedMessage(reader({ "message:en": "   " }), ["en"])).toBeNull();
  });
});

describe("nextStatus", () => {
  it("suggests the next lifecycle step and stops at resolved", () => {
    expect(nextStatus("investigating")).toBe("identified");
    expect(nextStatus("monitoring")).toBe("resolved");
    expect(nextStatus("resolved")).toBe("resolved");
    expect(nextStatus("weird")).toBe("investigating");
  });
});
