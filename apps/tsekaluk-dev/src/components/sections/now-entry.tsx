import { logger } from "@nebutra/logger";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

interface NowData {
  date: string;
  building: string[];
  thinking: string[];
  shipped: string[];
  reading: string[];
}

async function getLatestNowEntry(): Promise<NowData | null> {
  if (!prisma) return null;
  try {
    const entry = await prisma.nowEntry.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (!entry) return null;
    return {
      date: entry.date,
      building: entry.building,
      thinking: entry.thinking,
      shipped: entry.shipped,
      reading: entry.reading,
    };
  } catch (err: unknown) {
    const isConnRefused =
      (err as { code?: string }).code === "ECONNREFUSED" ||
      (err instanceof Error && err.message.includes("ECONNREFUSED"));
    if (isConnRefused) {
      logger.warn("[now-entry] Database connection refused. Using fallback layout.");
    } else {
      logger.error("[now-entry] Failed to fetch latest entry", err);
    }
    return null;
  }
}

export async function NowEntry({ preview = false }: { preview?: boolean }) {
  const t = await getTranslations("now");
  const data = await getLatestNowEntry();

  const sections: {
    key: keyof Omit<NowData, "date">;
    label: string;
    previewOnly?: boolean;
  }[] = [
    { key: "building", label: t("sections.building"), previewOnly: true },
    { key: "shipped", label: t("sections.shipped"), previewOnly: true },
    { key: "thinking", label: t("sections.thinking") },
    { key: "reading", label: t("sections.reading") },
  ];

  if (!data) {
    return <p className="text-gray-400 dark:text-gray-500">{t("no_updates")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">{t("last_updated")}: {data.date}</div>
      {sections
        .filter((section) => !preview || section.previewOnly)
        .map((section) => (
          <div key={section.key} className="space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{section.label}</h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
              {data[section.key].map((item, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
