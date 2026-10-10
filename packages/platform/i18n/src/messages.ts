/**
 * Message loading — the one path every next-intl app uses to turn a locale into
 * the messages it renders.
 *
 * Contract: `en.json` is the only source. A target catalog holds the strings
 * that have actually been translated and nothing else; a key it does not have
 * renders the English source. So a new English string shows up everywhere the
 * moment it lands, and the translation workflow fills it in afterwards — nobody
 * copies English into 33 files to make a check pass (the copies were
 * indistinguishable from translations, and 45 000 of them shipped).
 *
 * The importer stays in app code because a bundler can only enumerate a
 * template `import()` relative to the file that contains it:
 *
 *   loadMessages(locale, (l) => import(`../../messages/${l}.json`))
 */

export type Messages = { [key: string]: unknown };

type Importer = (locale: string) => Promise<{ default: Messages } | Messages>;

function isRecord(value: unknown): value is Messages {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deep-merge `overlay` onto `base`. Objects merge key by key; anything else in
 * the overlay replaces the base value. Neither argument is mutated.
 */
export function mergeMessages<T extends Messages>(base: T, overlay: Messages | undefined): T {
  if (!overlay) return base;
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const current = out[key];
    out[key] = isRecord(current) && isRecord(value) ? mergeMessages(current, value) : value;
  }
  return out as T;
}

async function importCatalog(load: Importer, locale: string): Promise<Messages | undefined> {
  try {
    const mod = await load(locale);
    const data = isRecord(mod) && "default" in mod && isRecord(mod.default) ? mod.default : mod;
    return isRecord(data) ? data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Load the messages for a message locale (`ja`, `zh-Hans`), layered over the
 * English source so every key resolves. A missing catalog file is English.
 */
export async function loadMessages<T extends Messages = Messages>(
  messageLocale: string,
  load: Importer,
  sourceLocale = "en",
): Promise<T> {
  const source = await importCatalog(load, sourceLocale);
  if (!source) throw new Error(`[i18n] source catalog '${sourceLocale}' could not be loaded`);
  if (messageLocale === sourceLocale) return source as T;
  return mergeMessages(source, await importCatalog(load, messageLocale)) as T;
}

/**
 * Keep only the listed subtrees of a message object, at their original paths.
 * A path is a namespace (`nav`) or a dotted subtree (`legalPages.contact`).
 *
 * Used to hand a client provider just what its client components read: the
 * full catalog is serialised into every page's RSC payload otherwise, and on
 * Forge that was 71 KB of tool strings on a page that renders one tool.
 */
export function pickMessages(messages: Messages, paths: readonly string[]): Messages {
  const out: Messages = {};
  for (const path of paths) {
    const parts = path.split(".");
    let source: unknown = messages;
    for (const part of parts) source = isRecord(source) ? source[part] : undefined;
    if (source === undefined) continue;

    let target = out;
    for (const part of parts.slice(0, -1)) {
      const next = target[part];
      target = isRecord(next) ? next : (target[part] = {});
    }
    const leaf = parts[parts.length - 1] as string;
    const existing = target[leaf];
    target[leaf] =
      isRecord(existing) && isRecord(source) ? mergeMessages(existing, source) : source;
  }
  return out;
}
