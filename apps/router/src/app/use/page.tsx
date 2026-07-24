import { PlaygroundClient } from "@/components/playground-client";
import { getListedModelIds } from "@/lib/listing-catalog";

export const metadata = { title: "快捷使用" };
export const dynamic = "force-dynamic";

export default async function UsePage() {
  const models = await getListedModelIds();
  return (
    <div className="mx-auto flex h-[calc(100vh-3rem-2.25rem)] max-w-[1200px] flex-col p-3 md:p-4">
      <PlaygroundClient models={models} variant="usage" />
    </div>
  );
}
