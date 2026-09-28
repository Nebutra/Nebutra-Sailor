import { AssetGallery } from "@/components/home/asset-gallery";

export const metadata = { title: "Assets" };

export default function AssetsPage() {
  return (
    <div className="pt-8">
      <AssetGallery heading="Assets" level={1} />
    </div>
  );
}
