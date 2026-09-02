import { IdPhotoStudio } from "@/components/IdPhotoStudio";
import { QuietPage } from "@/components/QuietPage";

export default async function IdPhotoPage({
  searchParams,
}: {
  searchParams: Promise<{ sku?: string; size?: string }>;
}) {
  const { sku, size } = await searchParams;
  return (
    <QuietPage active="/create" title="领证照" line="先留下一张可以用的。">
      <IdPhotoStudio initialSkuId={sku} initialSizeId={size} />
    </QuietPage>
  );
}
