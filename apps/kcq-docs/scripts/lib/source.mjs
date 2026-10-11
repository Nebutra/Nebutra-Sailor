/**
 * The docs are built from the same pinned chart checkout as the product (apps/kcq/chart-source.json):
 * a page can only describe what that commit ships. CI sets KCQ_SOURCE_DIR to its checkout; locally
 * the resolver fetches the pin into .nebutra/kcq-source/<sha>.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveChartSource } from "../../../kcq/scripts/chart-source.mjs";

export const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const KCQ_APP_ROOT = resolve(APP_ROOT, "../kcq");

export function readPin() {
  return JSON.parse(readFileSync(resolve(KCQ_APP_ROOT, "chart-source.json"), "utf8"));
}

export function chartSource() {
  return resolveChartSource(KCQ_APP_ROOT);
}

/** GitHub URLs for the pinned commit (the fork that Sailor builds from). */
export function githubLinks(pin) {
  const repository = pin.repository.replace(/\.git$/, "");
  return {
    repository,
    upstream: pin.upstreamRepository.replace(/\.git$/, ""),
    blob: (file) => `${repository}/blob/${pin.commit}/${file}`,
    tree: (dir) => `${repository}/tree/${pin.commit}/${dir}`,
    /** "Edit on GitHub" targets main: an edit is a PR against the current source, not the pin. */
    edit: (file) => `${repository}/edit/main/${file}`,
  };
}
