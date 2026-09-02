import Image from "next/image";
import Link from "next/link";
import { listWardrobePieces } from "@/catalog/wardrobe";
import { QuietPage } from "@/components/QuietPage";

export default function WardrobePage() {
  const pieces = listWardrobePieces();

  return (
    <QuietPage
      active="/wardrobe"
      title="今天穿什么？"
      line="衣柜里挂的是衣服。拍什么，是下一件事。"
    >
      {pieces.length ? (
        <div className="masonry" data-ground="paper">
          {pieces.map((piece) => (
            <Link
              key={piece.id}
              className="masonry-item"
              href={piece.href}
              data-live="true"
              data-wardrobe={piece.id}
            >
              <figure>
                <Image
                  className="tile-photo tile-photo-garment"
                  src={piece.sample}
                  alt={piece.title}
                  width={piece.widthPx}
                  height={piece.heightPx}
                />
                <figcaption>
                  <span className="tile-title">{piece.title}</span>
                  <span className="tile-sub">{piece.line}</span>
                  <span className="tile-spec">{piece.specIdentity}</span>
                  <span className="tile-spec">{piece.specMeasures}</span>
                  <span className="tile-brand">{piece.brand}</span>
                </figcaption>
              </figure>
            </Link>
          ))}
        </div>
      ) : (
        <p className="note">这一件还没挂出来。</p>
      )}
    </QuietPage>
  );
}
