import { CATALOG, type CatalogEntry } from "./manifest";

/**
 * The catalog as data — safe to import from a server (Studio pages, the
 * registry route). Demo components load through `@nebutra/ui/catalog/loaders`,
 * a separate entry, so reading the list never pulls a demo into the graph.
 */
export {
  CATALOG,
  CATALOG_CATEGORIES,
  type CatalogCategory,
  type CatalogEntry,
  type CatalogImport,
  type CatalogStatus,
  INTERNAL_FILES,
} from "./manifest";

const byId = new Map(CATALOG.map((entry) => [entry.id, entry]));

export function catalogEntry(id: string): CatalogEntry | undefined {
  return byId.get(id);
}

/** The entry a demo belongs to — demo ids start with their entry's id. */
export function entryForDemo(demoId: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.demos.includes(demoId));
}
