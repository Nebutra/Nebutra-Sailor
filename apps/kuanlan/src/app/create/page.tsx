import Image from "next/image";
import Link from "next/link";
import { listPublicSkus } from "@/catalog/skus";
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
  const live = listPublicSkus();
  const query = q?.trim() ?? "";
  const wantsIdPhoto = /证照|护照|签证|一寸|二寸/.test(query);

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
          <Link className="masonry-item" href="/create/id-photo" data-live="true">
            <figure>
              <Image
                className="tile-photo"
                src={orbitSrc("01.jpg")}
                alt=""
                width={720}
                height={1080}
              />
              <figcaption>
                <span className="tile-title">领证照</span>
                <span className="tile-sub">
                  先留下一张可以用的 · {[...new Set(live.map((sku) => sku.title))].join(" / ")}
                </span>
              </figcaption>
            </figure>
          </Link>
          {ORBIT_TILES.filter((tile) => tile.href !== "/create/id-photo").map((tile) => (
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
