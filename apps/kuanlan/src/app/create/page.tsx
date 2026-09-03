import Image from "next/image";
import Link from "next/link";
import { idPhotoParentTile, listIdPhotoCreateTiles } from "@/catalog/skus";
import { listWardrobePieces } from "@/catalog/wardrobe";
import { SiteNav } from "@/components/SiteNav";
import { ORBIT_TILES, orbitSrc } from "@/lib/orbit";
import {
  type CreateView,
  createFilterHref,
  isCreateView,
  parseCreateView,
  resolveCreateQuery,
} from "@/lib/shoot";

function filters(query: { view?: CreateView; q?: string; piece?: string }) {
  return [
    { id: "all" as const, label: "全部", href: createFilterHref({ q: query.q, view: "all" }) },
    {
      id: "garment" as const,
      label: "衣服",
      href: createFilterHref({ ...query, view: "garment" }),
    },
    {
      id: "id-photo" as const,
      label: "领证照",
      href: createFilterHref({ ...query, view: "id-photo" }),
    },
  ];
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; piece?: string; view?: string }>;
}) {
  const { q, piece: pieceId, view: viewParam } = await searchParams;
  const query = q?.trim() ?? "";
  const resolved = resolveCreateQuery(query);
  const explicitView = isCreateView(viewParam);
  const view = explicitView ? parseCreateView(viewParam) : (resolved.view ?? "all");
  const piece = pieceId || (explicitView && view === "all" ? undefined : resolved.piece);
  const garments = listWardrobePieces();
  const garment = garments.find((item) => item.id === piece);
  const parent = idPhotoParentTile();
  const specs = listIdPhotoCreateTiles({ excludeParent: !garment }).filter((sku) => {
    if (garment && sku.garmentId !== garment.id) return false;
    if (resolved.sizeId && !sku.sizes.some((size) => size.id === resolved.sizeId)) return false;
    return true;
  });
  const showClothes = view === "garment" && !garment;
  const showParent = view !== "garment" && !garment;
  const showSpecs = view !== "garment" || Boolean(garment);
  const showLater = view === "all" && !garment && !query;
  const lede = garment
    ? `${garment.title}。现在可以这样拍。`
    : query
      ? `按“${query}”看这些。`
      : "告诉观澜，你想拍什么。";

  return (
    <div className="shell">
      <SiteNav active="/create" query={query} />
      <main className="explore">
        <h1>今天想怎么拍？</h1>
        <p className="lede">{lede}</p>
        <div className="filters">
          {filters({ view, q: query || undefined, piece }).map((filter) => (
            <Link
              key={filter.id}
              className="pill"
              href={filter.href}
              data-active={filter.id === view}
            >
              {filter.label}
            </Link>
          ))}
        </div>
        <div className="masonry" data-ground={showClothes ? "smoke" : undefined}>
          {showParent ? (
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
          ) : null}
          {showClothes
            ? garments.map((item) => (
                <Link
                  key={item.id}
                  className="masonry-item"
                  href={item.href}
                  data-live="true"
                  data-wardrobe={item.id}
                >
                  <figure>
                    <Image
                      className="tile-photo tile-photo-garment"
                      src={item.sample}
                      alt={item.title}
                      width={item.widthPx}
                      height={item.heightPx}
                    />
                    <figcaption>
                      <span className="tile-title">{item.title}</span>
                      <span className="tile-sub">{item.line}</span>
                    </figcaption>
                  </figure>
                </Link>
              ))
            : null}
          {showSpecs
            ? specs.map((sku) => (
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
                        {sku.sizes.map((size) => size.label).join(" / ")}
                      </span>
                    </figcaption>
                  </figure>
                </Link>
              ))
            : null}
          {showLater
            ? ORBIT_TILES.filter((tile) => tile.href !== "/create/id-photo").map((tile) => (
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
              ))
            : null}
        </div>
      </main>
    </div>
  );
}
