import { FilterBar } from "@/components/filter-bar";
import { WorkGrid } from "@/components/work-grid";
import { listSpecimens, listTypefaces, listWorks } from "@/lib/catalog";

export default function HomePage() {
  const works = listWorks({ status: "published" });
  const specimens = listSpecimens();
  const typefaces = listTypefaces();
  return (
    <>
      <FilterBar />
      <WorkGrid works={works} specimens={specimens} typefaces={typefaces} />
    </>
  );
}
