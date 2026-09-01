import Image from "next/image";
import Link from "next/link";
import { idPhotoParentTile, listIdPhotoCreateTiles } from "@/catalog/skus";
import { SiteNav } from "@/components/SiteNav";
import { ORBIT_TILES, orbitSrc } from "@/lib/orbit";

const FILTERS = [
  { id: "all", label: "全部", href: "/create" },
  { id: "id-photo", label: "领证照", href: "/create/id-photo" },
  { id: "feel", label: "感觉", href: "/create" },
  { id: "far", label: "远方", href: "/create" },
] as const;

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const wantsIdPhoto = /证照|护照|签证|一寸|二寸/.test(query);
  const parent = idPhotoParentTile();
  const specs = listIdPhotoCreateTiles();

  return (
    <div className="shell">
      <SiteNav active="/create" query={query} />
      <main className="explore">
        <h1>今天想怎么拍？</h1>
        <p className="lede">
          {query ? `“${query}”` : "告诉观澜，你想拍什么。"}
          {wantsIdPhoto ? " 这一刻，先从领证照开始。" : ""}
        </p>
        <div className="filters">
          {FILTERS.map((filter) => (
            <Link
              key={filter.id}
              className="pill"
              href={filter.href}
              data-active={filter.id === (wantsIdPhoto ? "id-photo" : "all")}
            >
              {filter.label}
            </Link>
          ))}
        </div>
        <div className="masonry">
          <Link className="masonry-item" href={parent.href} data-live="true" data-kind="id-photo">
            <figure>
              <Image
                className="tile-photo"
                src={parent.sample}
                alt="领证照样例"
                width={parent.widthPx}
                height={parent.heightPx}
              />
              <figcaption>
                <span className="tile-title">{parent.title}</span>
                <span className="tile-sub">{parent.subtitle}</span>
              </figcaption>
            </figure>
          </Link>
          {specs.map((sku) => (
            <Link
              key={sku.id}
              className="masonry-item"
              href={sku.href}
              data-live="true"
              data-kind="id-photo"
              data-sku={sku.id}
            >
              <figure>
                <Image
                  className="tile-photo"
                  src={sku.sample}
                  alt={`${sku.title}${sku.subtitle}样例`}
                  width={sku.widthPx}
                  height={sku.heightPx}
                />
                <figcaption>
                  <span className="tile-title">
                    {sku.title} · {sku.subtitle}
                  </span>
                  <span className="tile-sub">
                    {sku.widthMm} × {sku.heightMm} mm
                  </span>
                </figcaption>
              </figure>
            </Link>
          ))}
          {wantsIdPhoto
            ? null
            : ORBIT_TILES.filter((tile) => tile.href !== "/create/id-photo").map((tile) => (
                <Link
                  key={tile.name}
                  className="masonry-item"
                  href={tile.href ?? "/create"}
                  data-live={tile.live ? "true" : "false"}
                >
                  <figure>
                    <Image
                      className="tile-photo"
                      src={orbitSrc(tile.name)}
                      alt=""
                      width={720}
                      height={900}
                    />
                    <figcaption>
                      <span className="tile-title">{tile.label}</span>
                      <span className="tile-sub">{tile.live ? "可以拍" : "感觉还在后面"}</span>
                    </figcaption>
                  </figure>
                </Link>
              ))}
        </div>
      </main>
    </div>
  );
}
