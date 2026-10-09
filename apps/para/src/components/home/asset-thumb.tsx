import { MusicalNotes } from "@nebutra/icons";
import { isStillUrl } from "@/domain/gallery";
import type { Asset } from "@/domain/types";

/**
 * One asset as a picture that fills its box. Stills go in an <img>; a video shows its first frame
 * (muted, never autoplaying — a grid of moving thumbnails is noise); audio has no picture, so it
 * gets a quiet glyph rather than a broken image.
 */
export function AssetThumb({ asset, className = "" }: { asset: Asset; className?: string }) {
  const fill = `size-full object-cover ${className}`;
  if (asset.type === "audio") {
    return (
      <div className={`flex size-full items-center justify-center bg-neutral-3 ${className}`}>
        <MusicalNotes className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (asset.type === "video" && !isStillUrl(asset.url)) {
    return <video src={asset.url} muted playsInline preload="metadata" className={fill} />;
  }
  return <img src={asset.url} alt="" loading="lazy" draggable={false} className={fill} />;
}
