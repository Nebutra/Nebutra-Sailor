import { PlaygroundClient } from "@/components/playground-client";
import { requireAuth } from "@/lib/auth";
import { getListedModelIds } from "@/lib/listing-catalog";

export const metadata = { title: "快捷使用" };
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
    <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
      <h1 className="text-[20px] font-semibold tracking-tight text-[var(--neutral-12)]">
        快捷使用
      </h1>
      <p className="mt-1 text-[13px] text-[var(--neutral-10)]">
        OpenAI 兼容对话 · 走计费边缘，结束后显示这一次的花费
      </p>
      <div className="mt-5">
        <PlaygroundClient models={list} {...(seed ? { initialModel: seed } : {})} />
      </div>
    </div>
  );
}
