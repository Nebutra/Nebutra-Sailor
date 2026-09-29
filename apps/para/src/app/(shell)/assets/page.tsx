import { AssetGallery } from "@/components/home/asset-gallery";

export const metadata = { title: "资产" };

export default function AssetsPage() {
  return (
    <div className="pt-2">
      <AssetGallery heading="资产" level={1} />
    </div>
  );
}
