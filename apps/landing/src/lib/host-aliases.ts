/**
 * Hosts that are a section of this app, and nothing else.
 *
 * status.<domain> is the status page; open.<domain> is the open page. Each
 * host serves its section at its root (and the section's sub-pages below it),
 * and every other path belongs to the apex. Before this, only the root was
 * mapped and everything else fell through, so status.<domain>/roadmap and
 * status.<domain>/pricing served the whole site a second time under the
 * status host. The apex, in turn, hands a section's paths to its host, so
 * each page has one address.
 */

export interface HostAlias {
  /** The host, e.g. status.<domain>. */
  host: string;
  /** The section it serves, as a path segment: "status". */
  section: string;
  /** Sub-pages of the section addressed at the host root, e.g. /history. */
  subPaths?: RegExp;
  /**
   * Where the section's one address is. "host": it is served at the host and
   * the apex hands its copy over (status). "apex": the host is only a short
   * name that sends visitors to the apex page (open).
   */
  canonical: "host" | "apex";
}

export type HostRoute =
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect"; url: string }
  | { kind: "pass" };

const PASS: HostRoute = { kind: "pass" };

/** Split "/zh-Hans/history" into its locale prefix ("/zh-Hans") and the rest ("/history"). */
function splitLocale(pathname: string, locales: readonly string[]) {
  const first = pathname.split("/")[1] ?? "";
  if (locales.includes(first)) {
    const rest = pathname.slice(first.length + 1) || "/";
    return { prefix: `/${first}`, rest };
  }
  return { prefix: "", rest: pathname };
}

export function routeHost(input: {
  host: string | undefined;
  pathname: string;
  search: string;
  apex: string;
  aliases: readonly HostAlias[];
  locales: readonly string[];
  defaultLocale: string;
}): HostRoute {
  const { host, pathname, search, apex, aliases, locales, defaultLocale } = input;
  const { prefix, rest } = splitLocale(pathname, locales);
  // The default locale carries no prefix in a rewritten path.
  const keep = prefix === `/${defaultLocale}` ? "" : prefix;

  const alias = aliases.find((a) => a.host === host);
  if (alias?.canonical === "apex") {
    const target = rest === "/" ? `${keep}/${alias.section}` : pathname;
    return { kind: "redirect", url: `https://${apex}${target}${search}` };
  }
  if (alias) {
    if (rest === "/") return { kind: "rewrite", pathname: `${keep}/${alias.section}` };
    const sub = rest.slice(1);
    if (alias.subPaths?.test(sub)) {
      return { kind: "rewrite", pathname: `${keep}/${alias.section}/${sub}` };
    }
    // /status typed on the status host: drop the redundant segment.
    const own = `/${alias.section}`;
    if (rest === own || rest.startsWith(`${own}/`)) {
      return {
        kind: "redirect",
        url: `https://${alias.host}${prefix}${rest.slice(own.length) || "/"}${search}`,
      };
    }
    // Any other page belongs to the apex.
    return { kind: "redirect", url: `https://${apex}${pathname}${search}` };
  }

  // On the apex, a section with its own host lives there. Only the apex: a
  // local or preview host keeps serving /status itself.
  if (host !== apex && host !== `www.${apex}`) return PASS;
  for (const a of aliases) {
    if (a.canonical !== "host") continue;
    const own = `/${a.section}`;
    if (rest === own || rest.startsWith(`${own}/`)) {
      const tail = rest.slice(own.length) || "/";
      return { kind: "redirect", url: `https://${a.host}${prefix}${tail}${search}` };
    }
  }
  return PASS;
}
