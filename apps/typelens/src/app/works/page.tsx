import { FilterBar } from "@/components/filter-bar";
import { WorkGrid } from "@/components/work-grid";
import {
  type ListWorksOptions,
  listSpecimens,
  listTypefaces,
  listWorks,
  type Medium,
} from "@/lib/catalog";

type SearchParams = Promise<{ medium?: string; mood?: string }>;

const MEDIA = new Set([
  "poster",
  "website",
  "app-ui",
  "brand-identity",
  "editorial",
  "packaging",
  "other",
]);

export default async function WorksPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const opts: ListWorksOptions = { status: "published" };
  if (sp.medium && MEDIA.has(sp.medium)) {
    opts.medium = sp.medium as Medium;
  }
  if (sp.mood) {
    opts.mood = sp.mood;
  }

  const works = listWorks(opts);
  const filterProps: { medium?: string; mood?: string } = {};
  if (sp.medium) filterProps.medium = sp.medium;
  if (sp.mood) filterProps.mood = sp.mood;

  return (
    <>
      <FilterBar {...filterProps} />
      <WorkGrid works={works} specimens={listSpecimens()} typefaces={listTypefaces()} />
    </>
  );
}
