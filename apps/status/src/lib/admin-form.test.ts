import { describe, expect, it } from "vitest";
import { localizedMessage, localizedTitle, messageFieldName, nextStatus } from "./admin-form";

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

describe("localizedTitle", () => {
  it("splits the default-language title from its translations", () => {
    expect(
      localizedTitle(reader({ "title:zh-CN": "开放 API 变慢", "title:en": "Public API slow" }), [
        "zh-CN",
        "en",
      ]),
    ).toEqual({ title: "开放 API 变慢", titleI18n: { en: "Public API slow" } });
    expect(localizedTitle(reader({}), ["en"])).toBeNull();
  });
});
