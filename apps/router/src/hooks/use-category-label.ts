"use client";

import { useTranslations } from "next-intl";
import type { ListingCategory } from "@/lib/listing-catalog";

/** Localised name for a shelf category (`category.<id>` in messages/*.json). */
export function useCategoryLabel(): (category: ListingCategory) => string {
  const t = useTranslations("category");
  return (category) => t(category);
}
