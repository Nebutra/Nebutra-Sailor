import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ model?: string }> };

/** 旧路径兼容 → 快捷使用 */
export default async function PlaygroundRedirect({ searchParams }: Props) {
  const { model } = await searchParams;
  const q = model ? `?model=${encodeURIComponent(model)}` : "";
  redirect(`/use${q}`);
}
