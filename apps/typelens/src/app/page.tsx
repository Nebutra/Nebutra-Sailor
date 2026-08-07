import { FilterBar } from "@/components/filter-bar";
import { WORKS_PAGE_SIZE, WorkGrid } from "@/components/work-grid";
import { listSpecimens, listTypefaces, listWorks } from "@/lib/catalog";

/** Collection-first home — no marketing mock tiles. */
export const dynamic = "force-static";

function preferImaged(works: ReturnType<typeof listWorks>) {
  return [...works].sort((a, b) => {
    const ai = a.imageAssets?.length ? 1 : 0;
    const bi = b.imageAssets?.length ? 1 : 0;
    return bi - ai;
  });
}

export default function HomePage() {
  const all = preferImaged(listWorks({ status: "published" }));
  const works = all.slice(0, WORKS_PAGE_SIZE);
  const workIds = new Set(works.map((w) => w.id));
  const specimens = listSpecimens().filter((s) => workIds.has(s.workId));
  const typefaces = listTypefaces({ commercialOnly: false });

  return (
    <>
      <FilterBar />
      <WorkGrid
        works={works}
        specimens={specimens}
        typefaces={typefaces}
        total={all.length}
        page={1}
        basePath="/works"
      />
    </>
  );
}
