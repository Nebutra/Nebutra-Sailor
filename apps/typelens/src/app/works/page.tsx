import { FilterBar } from "@/components/filter-bar";
import { WorkGrid } from "@/components/work-grid";
import { listSpecimens, listTypefaces, listWorks, type Medium } from "@/lib/catalog";

type SearchParams = Promise<{ medium?: string; mood?: string }>;

export default async function WorksPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const medium = (sp.medium || undefined) as Medium | undefined;
  const mood = sp.mood || undefined;
  const works = listWorks({ status: "published", medium, mood });
  return (
    <>
      <FilterBar medium={sp.medium} mood={sp.mood} />
      <WorkGrid works={works} specimens={listSpecimens()} typefaces={listTypefaces()} />
    </>
  );
}
