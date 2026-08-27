import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import { docs } from "@/.source/server";
import { i18n } from "./i18n";

export const source = loader({
  // brand.domains.docs is dedicated to docs (clean-subdomain pattern, like
  // docs.anthropic.com / docs.cursor.com), so docs pages mount at the host
  // root rather than under /docs. Old `/docs/*` URLs are 301'd at the
  // origin nginx layer for back-compat.
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
