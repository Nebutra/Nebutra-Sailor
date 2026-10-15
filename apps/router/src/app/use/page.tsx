import { getTranslations } from "next-intl/server";
import { PlaygroundClient } from "@/components/playground-client";
import { requireAuth } from "@/lib/auth";
import { getListedModelIds } from "@/lib/listing-catalog";
import { getBaseUrlHint } from "@/lib/model-routes";

export async function generateMetadata() {
  const t = await getTranslations("console.playground");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ model?: string }> };

/**
 * 302「快捷使用」— 对话试调用.
 *
 * Signed in, because the call is charged: the tenant's own key pays for it and
 * there is no anonymous wallet to bill. The model comes off the query string
 * **here**, on the server, so the first paint already shows the model the link
 * asked for rather than the catalogue's first entry.
 */
export default async function UsePage({ searchParams }: Props) {
  await requireAuth("/use");
  const t = await getTranslations("console.playground");
  const { model } = await searchParams;
  const models = await getListedModelIds();
  const seed = model?.trim();
  const list =
    seed && !models.includes(seed)
      ? [seed, ...models]
      : models.length
        ? models
        : seed
          ? [seed]
          : [];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
      <h1 className="text-3xl text-foreground">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      <div className="mt-6">
        <PlaygroundClient
          models={list}
          baseUrl={getBaseUrlHint()}
          {...(seed ? { initialModel: seed } : {})}
        />
      </div>
    </div>
  );
}
