import { PlaygroundClient } from "@/components/playground-client";
import { getListedModelIds } from "@/lib/listing-catalog";

export const metadata = { title: "快捷使用" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ model?: string }> };

/** 302「快捷使用」— 对话试调用 */
export default async function UsePage({ searchParams }: Props) {
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
      <p className="mt-1 text-[13px] text-[var(--neutral-10)]">OpenAI 兼容对话 · 选模型试调用</p>
      <div className="mt-5">
        <PlaygroundClient models={list} />
      </div>
    </div>
  );
}
