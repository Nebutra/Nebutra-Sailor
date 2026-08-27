import { FilterBar } from "@/components/filter-bar";
import { WORKS_PAGE_SIZE, WorkGrid } from "@/components/work-grid";
import {
  type ListWorksOptions,
  listSpecimens,
  listTypefaces,
  listWorks,
  type Medium,
} from "@/lib/catalog";

type SearchParams = Promise<{ medium?: string; mood?: string; page?: string }>;

const MEDIA = new Set([
  "poster",
  "website",
  "app-ui",
  "brand-identity",
  "editorial",
  "packaging",
  "other",
]);

function preferImaged(works: ReturnType<typeof listWorks>) {
  return [...works].sort((a, b) => {
    const ai = a.imageAssets?.length ? 1 : 0;
    const bi = b.imageAssets?.length ? 1 : 0;
    return bi - ai;
  });
}

export default async function WorksPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const opts: ListWorksOptions = { status: "published" };
  if (sp.medium && MEDIA.has(sp.medium)) {
    opts.medium = sp.medium as Medium;
  }
  if (sp.mood) {
    opts.mood = sp.mood;
  }

  const all = preferImaged(listWorks(opts));
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const start = (page - 1) * WORKS_PAGE_SIZE;
  const works = all.slice(start, start + WORKS_PAGE_SIZE);
  const workIds = new Set(works.map((w) => w.id));
  const specimens = listSpecimens().filter((s) => workIds.has(s.workId));

  const filterProps: { medium?: string; mood?: string } = {};
  if (sp.medium) filterProps.medium = sp.medium;
  if (sp.mood) filterProps.mood = sp.mood;

  return (
    <>
      <FilterBar {...filterProps} />
      <WorkGrid
        works={works}
        specimens={specimens}
        typefaces={listTypefaces({ commercialOnly: false })}
        total={all.length}
        page={page}
        basePath="/works"
        query={{ medium: sp.medium, mood: sp.mood }}
      />
    </>
  );
}
