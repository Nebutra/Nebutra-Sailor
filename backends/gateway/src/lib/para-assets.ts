/**
 * Which URLs a PARA generation may carry as a reference.
 *
 * A reference URL is fetched by the model vendor (first frame, image to edit), so accepting any URL
 * would let a caller point our paid vendor call at arbitrary hosts. Only PARA's own asset hosts are
 * allowed: the public base the origin publishes generated and uploaded assets under
 * (`UPLOAD_PUBLIC_BASE_URL` on the AI origin, backends/python/ai/app/uploads/persist.py). The
 * gateway reads the same variable — set it to the same value on the gateway — plus optional extra
 * bases in `PARA_ASSET_BASE_URLS` (comma-separated). Unset means no URL is accepted: fail closed.
 */

function allowedBases(): URL[] {
  const raw = [process.env.UPLOAD_PUBLIC_BASE_URL, process.env.PARA_ASSET_BASE_URLS]
    .filter((v): v is string => Boolean(v))
    .join(",");
  const bases: URL[] = [];
  for (const entry of raw.split(",")) {
    const text = entry.trim();
    if (!text) continue;
    try {
      const url = new URL(text.endsWith("/") ? text : `${text}/`);
      if (url.protocol === "https:" || url.protocol === "http:") bases.push(url);
    } catch {
      // A malformed base allows nothing rather than everything.
    }
  }
  return bases;
}

/** True when `value` is an absolute URL under one of PARA's own asset bases. */
export function isParaAssetUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  return allowedBases().some(
    (base) =>
      url.protocol === base.protocol &&
      url.host === base.host &&
      url.pathname.startsWith(base.pathname) &&
      // No climbing out of the base with dot segments (URL() already resolves them).
      !url.pathname.slice(base.pathname.length).split("/").includes(".."),
  );
}

/** A reference URL outside PARA's asset hosts. The route answers it with 400. */
export class ReferenceUrlError extends Error {
  readonly code = "reference_url_not_allowed";
  constructor(public readonly url: string) {
    super("Reference URLs must point at PARA's own asset storage");
    this.name = "ReferenceUrlError";
  }
}

/** Throws ReferenceUrlError on the first disallowed reference URL. */
export function assertReferenceUrls(
  references: ReadonlyArray<{ url?: string | undefined }> | undefined,
): void {
  for (const ref of references ?? []) {
    if (ref.url !== undefined && !isParaAssetUrl(ref.url)) throw new ReferenceUrlError(ref.url);
  }
}
