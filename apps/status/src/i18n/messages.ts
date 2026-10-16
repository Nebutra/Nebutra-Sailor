import type { AppLocale } from "@/lib/locale";

export type Messages = typeof import("../../messages/en.json");

export async function loadMessages(locale: AppLocale): Promise<Messages> {
  return locale === "zh-CN"
    ? (await import("../../messages/zh-CN.json")).default
    : (await import("../../messages/en.json")).default;
}
