import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import { docs } from "@/.source/server";
import { i18n } from "./i18n";

export const source = loader({
  // This bundle is an origin, not a public site: the landing proxy rewrites
  // `<site>/docs/<path>` to `<upstream>/<lang>/<path>`, stripping the /docs
  // prefix on the way in. So pages mount at the root here — adding a /docs
  // base would double the segment and 404 every page.
  baseUrl: "/",
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
