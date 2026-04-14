import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import { docs } from "@/.source/server";
import { i18n } from "./i18n";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  i18n,
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...(page.slugs || []), "image.webp"];
  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}
