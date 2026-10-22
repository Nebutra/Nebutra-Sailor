/**
 * API tables, read out of the library's own types.
 *
 * A hand-written prop table is wrong within a release, so none is written. This
 * module asks the TypeScript compiler what an export accepts: it resolves the
 * export from its source file, takes the first parameter of its call signature
 * as the props type, and reads each property's type, optionality, JSDoc and
 * declaration site off the checker.
 *
 * The declaration site is what separates a component's own props from the
 * hundreds it inherits. A property declared inside the library source is
 * "own" and goes in the main table; one declared in `@types/react`, Radix,
 * Base UI or Sonner is grouped under the package it came from.
 *
 * Defaults come from two places the checker cannot see on its own: an explicit
 * `@default` JSDoc tag, and the destructuring default in the component body
 * (`const { size = "md" } = props`). cva `defaultVariants` are merged in by the
 * page, which already has them.
 *
 * Server-side only: it builds a ts.Program and reads the repo off disk. The
 * Program is built once per process and reused across pages.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import type { ComponentEntry } from "./registry";
import { UI_SRC } from "./ui-source";

// ─── shapes ───────────────────────────────────────────────────────────────────

export interface ApiProp {
  name: string;
  /** Display type, truncated when very long. */
  type: string;
  /** The full type when `type` was truncated. */
  typeFull?: string;
  required: boolean;
  description: string;
  /** From `@default`, or the destructuring default in the implementation. */
  defaultValue: string | null;
  /** The `@deprecated` message, `""` when deprecated without one. */
  deprecated: string | null;
}

/** Props the component takes from a dependency rather than declaring itself. */
export interface InheritedGroup {
  /** Human label, e.g. "React (HTML attributes)" or "Radix Dialog". */
  source: string;
  props: Pick<ApiProp, "name" | "type" | "typeFull">[];
}

export interface ApiBlock {
  /** The export name, or `Parent.Part` for a compound part. */
  name: string;
  kind: "component" | "function";
  description: string;
  /** Properties declared in the library source. */
  props: ApiProp[];
  inherited: InheritedGroup[];
  /** Call signatures, for `kind: "function"`. */
  signatures: string[];
  /** Members of the returned object, for hooks. */
  members: ApiProp[];
  /** Compound parts hung off the root as statics: `Table.Head`. */
  parts: ApiBlock[];
}

export interface ExtractorOptions {
  /** Absolute paths of every file an export may be read from. */
  roots: string[];
  /** tsconfig whose compiler options (paths, jsx) the program should use. */
  tsconfigPath: string;
  /**
   * Directory whose files count as "own". Properties declared anywhere else —
   * node_modules, lib.d.ts — are grouped as inherited.
   */
  ownRoot: string;
}

export interface ApiExtractor {
  /** Null when the export does not exist or is not a component or function. */
  extract(file: string, exportName: string): ApiBlock | null;
}

// ─── program ──────────────────────────────────────────────────────────────────

function compilerOptionsFrom(tsconfigPath: string): ts.CompilerOptions {
  const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(read.config ?? {}, ts.sys, dirname(tsconfigPath));
  const options: ts.CompilerOptions = {
    ...parsed.options,
    noEmit: true,
    skipLibCheck: true,
    incremental: false,
    composite: false,
    declaration: false,
  };
  // The package's rootDir/outDir exist for its own build and make the program
  // reject root files that live elsewhere (the test fixtures).
  delete options.rootDir;
  delete options.outDir;
  delete options.tsBuildInfoFile;
  return options;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const MAX_TYPE_LENGTH = 120;

const TYPE_FLAGS =
  ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

/** `/…/node_modules/@radix-ui/react-dialog/dist/x.d.ts` → `@radix-ui/react-dialog`. */
export function packageOf(fileName: string): string | null {
  const marker = "node_modules/";
  const at = fileName.lastIndexOf(marker);
  if (at === -1) return null;
  const rest = fileName.slice(at + marker.length).split("/");
  const first = rest[0];
  if (!first) return null;
  return first.startsWith("@") ? `${first}/${rest[1] ?? ""}` : first;
}

export function labelForPackage(pkg: string | null): string {
  if (pkg === null) return "TypeScript lib";
  // `next` augments React's element types (fetchPriority and friends), so its
  // contribution reads as React's to anyone using the component.
  if (pkg === "@types/react" || pkg === "@types/react-dom" || pkg === "next") {
    return "React (HTML attributes)";
  }
  if (pkg.startsWith("@radix-ui/react-")) {
    const name = pkg
      .slice("@radix-ui/react-".length)
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return `Radix ${name}`;
  }
  if (pkg === "@base-ui/react" || pkg === "@base-ui-components/react") return "Base UI";
  if (pkg === "sonner") return "Sonner";
  return pkg;
}

function truncate(text: string): { type: string; typeFull?: string } {
  let flat = text.replace(/\s+/g, " ").trim();
  // ReactNode arrives pre-expanded whenever the checker rebuilt the union.
  if (/\bbigint \| (?:React\.)?ReactElement</.test(flat)) flat = "ReactNode";
  if (flat.length <= MAX_TYPE_LENGTH) return { type: flat };
  return { type: `${flat.slice(0, MAX_TYPE_LENGTH - 1)}…`, typeFull: flat };
}

function isOwn(declarations: readonly ts.Declaration[] | undefined, ownRoot: string): boolean {
  const decl = declarations?.[0];
  if (!decl) return false;
  const file = decl.getSourceFile().fileName;
  return !file.includes("/node_modules/") && file.startsWith(ownRoot);
}

/** The first declaration site's package, for grouping an inherited property. */
function sourceLabel(declarations: readonly ts.Declaration[] | undefined): string {
  const decl = declarations?.[0];
  if (!decl) return "Other";
  return labelForPackage(packageOf(decl.getSourceFile().fileName));
}

function defaultFromTags(tags: readonly ts.JSDocTagInfo[]): string | null {
  const tag = tags.find((t) => t.name === "default" || t.name === "defaultValue");
  if (!tag) return null;
  const text = ts.displayPartsToString(tag.text).trim();
  return text.length > 0 ? text.replace(/^`|`$/g, "") : null;
}

function deprecatedFromTags(tags: readonly ts.JSDocTagInfo[]): string | null {
  const tag = tags.find((t) => t.name === "deprecated");
  return tag ? ts.displayPartsToString(tag.text).trim() : null;
}

// ─── implementation defaults ──────────────────────────────────────────────────

function functionNodeOf(decl: ts.Node): ts.FunctionLikeDeclaration | null {
  if (ts.isFunctionDeclaration(decl) || ts.isArrowFunction(decl) || ts.isFunctionExpression(decl)) {
    return decl;
  }
  if (ts.isVariableDeclaration(decl) && decl.initializer) {
    return functionNodeOf(decl.initializer);
  }
  if (ts.isCallExpression(decl)) {
    // forwardRef(...) / memo(...): the component is the function argument.
    for (const arg of decl.arguments) {
      const found = functionNodeOf(arg);
      if (found) return found;
    }
  }
  if (ts.isAsExpression(decl) || ts.isParenthesizedExpression(decl)) {
    return functionNodeOf(decl.expression);
  }
  return null;
}

function literalDefault(init: ts.Expression): string | null {
  const text = init.getText();
  if (text.includes("\n") || text.length > 40) return null;
  // A default that is another prop, a call or a hook result is not a value a
  // reader can use; only literals and plain identifiers are worth printing.
  if (
    ts.isStringLiteralLike(init) ||
    ts.isNumericLiteral(init) ||
    init.kind === ts.SyntaxKind.TrueKeyword ||
    init.kind === ts.SyntaxKind.FalseKeyword ||
    init.kind === ts.SyntaxKind.NullKeyword ||
    ts.isPrefixUnaryExpression(init) ||
    (ts.isIdentifier(init) && init.text === "undefined")
  ) {
    return text.replace(/^'(.*)'$/, '"$1"');
  }
  return null;
}

function collectBindingDefaults(pattern: ts.ObjectBindingPattern, out: Map<string, string>) {
  for (const element of pattern.elements) {
    if (element.dotDotDotToken || !element.initializer) continue;
    const key = element.propertyName ?? element.name;
    if (!ts.isIdentifier(key) && !ts.isStringLiteral(key)) continue;
    const value = literalDefault(element.initializer);
    if (value !== null) out.set(key.text, value);
  }
}

/**
 * Destructuring defaults in the parameter list, and in `const { … } = props`
 * statements at the top of the body — the two shapes this library writes.
 */
export function implementationDefaults(decl: ts.Node | undefined): Map<string, string> {
  const defaults = new Map<string, string>();
  if (!decl) return defaults;
  const fn = functionNodeOf(decl);
  const param = fn?.parameters[0];
  if (!fn || !param) return defaults;

  const aliases = new Set<string>();
  if (ts.isIdentifier(param.name)) aliases.add(param.name.text);
  if (ts.isObjectBindingPattern(param.name)) {
    collectBindingDefaults(param.name, defaults);
    for (const element of param.name.elements) {
      if (element.dotDotDotToken && ts.isIdentifier(element.name)) aliases.add(element.name.text);
    }
  }

  if (fn.body && ts.isBlock(fn.body)) {
    for (const statement of fn.body.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        const init = declaration.initializer;
        if (
          ts.isObjectBindingPattern(declaration.name) &&
          init &&
          ts.isIdentifier(init) &&
          aliases.has(init.text)
        ) {
          collectBindingDefaults(declaration.name, defaults);
        }
      }
    }
  }

  return defaults;
}

// ─── extractor ────────────────────────────────────────────────────────────────

const SKIPPED_MEMBERS = new Set(["displayName", "$$typeof", "defaultProps", "prototype"]);

export function createApiExtractor(options: ExtractorOptions): ApiExtractor {
  const program = ts.createProgram({
    rootNames: options.roots,
    options: compilerOptionsFrom(options.tsconfigPath),
  });
  const checker = program.getTypeChecker();

  function exportSymbol(file: string, exportName: string): ts.Symbol | null {
    const source = program.getSourceFile(file);
    const moduleSymbol = source ? checker.getSymbolAtLocation(source) : undefined;
    if (!source || !moduleSymbol) return null;
    const found = checker.getExportsOfModule(moduleSymbol).find((s) => s.name === exportName);
    if (!found) return null;
    return found;
  }

  /**
   * An own prop is shown as it was written — `"sm" | "md" | "lg"` in declared
   * order, `React.ReactNode` as an alias — because the checker orders union
   * members by internal type id and expands aliases. A prop with no written
   * annotation (cva's mapped variants) falls back to the checker.
   */
  function writtenType(declaration: ts.Declaration | undefined): string | null {
    if (!declaration) return null;
    if (!ts.isPropertySignature(declaration) && !ts.isPropertyDeclaration(declaration)) return null;
    if (!declaration.type) return null;

    let text = declaration.type.getText().replace(/\s+/g, " ").trim();
    text = text.replace(/\s*\|\s*undefined$/, "");
    if (/^["'`]/.test(text)) text = text.replace(/\s*\|\s*null$/, "");
    return text;
  }

  function typeText(type: ts.Type, optional: boolean, at: ts.Node) {
    const shown = type;
    if (shown.isUnion()) {
      // `undefined` on an optional prop is "may be omitted", which the Required
      // column already says. `null` on a union of literals is cva's "no
      // variant", which is noise here; on anything else it is a real value.
      const stringy = shown.types.some((t) => t.isStringLiteral());
      const kept = shown.types.filter(
        (t) =>
          !(optional && t.flags & ts.TypeFlags.Undefined) &&
          !(stringy && t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)),
      );
      if (kept.length > 0 && kept.length !== shown.types.length) {
        const names = kept.map((t) => checker.typeToString(t, at, TYPE_FLAGS));
        // boolean arrives as true | false; fold it back.
        const folded =
          names.includes("true") && names.includes("false")
            ? ["boolean", ...names.filter((n) => n !== "true" && n !== "false")]
            : names;
        return truncate(folded.join(" | "));
      }
    }
    return truncate(checker.typeToString(shown, at, TYPE_FLAGS));
  }

  /**
   * `React.ComponentType<P> & { Head: … }` is a union of a class and a function
   * component, each intersected with the statics; only the function member has
   * a call signature, so look through the union.
   */
  function callSignaturesOf(type: ts.Type): readonly ts.Signature[] {
    const direct = type.getCallSignatures();
    if (direct.length > 0 || !type.isUnionOrIntersection()) return direct;
    for (const member of type.types) {
      const found = callSignaturesOf(member);
      if (found.length > 0) return found;
    }
    return [];
  }

  /** Every property a props type can carry; union members are merged. */
  function propertiesOf(propsType: ts.Type): { symbol: ts.Symbol; required: boolean }[] {
    const members = propsType.isUnion() ? propsType.types : [propsType];
    const merged = new Map<string, { symbol: ts.Symbol; required: boolean; seen: number }>();

    for (const member of members) {
      for (const symbol of checker.getPropertiesOfType(member)) {
        const required = !(symbol.flags & ts.SymbolFlags.Optional);
        const existing = merged.get(symbol.name);
        if (!existing) {
          merged.set(symbol.name, { symbol, required, seen: 1 });
        } else {
          existing.seen += 1;
          existing.required = existing.required && required;
          // Prefer the declaration that carries documentation.
          if (
            existing.symbol.getDocumentationComment(checker).length === 0 &&
            symbol.getDocumentationComment(checker).length > 0
          ) {
            existing.symbol = symbol;
          }
        }
      }
    }

    return [...merged.values()].map(({ symbol, required, seen }) => ({
      symbol,
      // Required only if every member of the union requires it.
      required: required && seen === members.length,
    }));
  }

  function toProp(
    symbol: ts.Symbol,
    required: boolean,
    at: ts.Node,
    defaults: Map<string, string>,
  ): ApiProp {
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
    const type = checker.getTypeOfSymbolAtLocation(symbol, declaration ?? at);
    const tags = symbol.getJsDocTags(checker);
    const written = isOwn(symbol.declarations, options.ownRoot) ? writtenType(declaration) : null;

    return {
      name: symbol.name,
      ...(written !== null ? truncate(written) : typeText(type, !required, declaration ?? at)),
      required,
      description: ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim(),
      defaultValue: defaultFromTags(tags) ?? defaults.get(symbol.name) ?? null,
      deprecated: deprecatedFromTags(tags),
    };
  }

  function splitProps(
    propsType: ts.Type,
    at: ts.Node,
    defaults: Map<string, string>,
  ): Pick<ApiBlock, "props" | "inherited"> {
    const props: ApiProp[] = [];
    const inherited = new Map<string, InheritedGroup>();

    for (const { symbol, required } of propertiesOf(propsType)) {
      // `key` and `ref` are React plumbing present on every component.
      if (symbol.name === "key" || symbol.name === "ref" || symbol.name.startsWith("data-")) {
        continue;
      }

      if (isOwn(symbol.declarations, options.ownRoot)) {
        props.push(toProp(symbol, required, at, defaults));
        continue;
      }

      const label = sourceLabel(symbol.declarations);
      const group = inherited.get(label) ?? { source: label, props: [] };
      const { name, type, typeFull } = toProp(symbol, required, at, defaults);
      group.props.push(typeFull ? { name, type, typeFull } : { name, type });
      inherited.set(label, group);
    }

    // Required first, then alphabetical: the order a reader scans in.
    props.sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name));
    const groups = [...inherited.values()];
    for (const group of groups) group.props.sort((a, b) => a.name.localeCompare(b.name));
    // Largest source last: the long React tail should not push Radix out of view.
    groups.sort((a, b) => a.props.length - b.props.length);

    return { props, inherited: groups };
  }

  function describe(symbol: ts.Symbol): string {
    const fromSymbol = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
    if (fromSymbol) return fromSymbol;
    // `const X = forwardRef(...)` keeps its JSDoc on the variable statement.
    const decl = symbol.valueDeclaration ?? symbol.declarations?.[0];
    const statement =
      decl && ts.isExportSpecifier(decl)
        ? decl.parent.parent
        : decl && ts.isVariableDeclaration(decl)
          ? decl.parent.parent
          : decl;
    if (!statement) return "";
    const docs = ts.getJSDocCommentsAndTags(statement).filter(ts.isJSDoc);
    const last = docs[docs.length - 1];
    return last ? (ts.getTextOfJSDocComment(last.comment)?.trim() ?? "") : "";
  }

  function extractBlock(
    name: string,
    type: ts.Type,
    symbol: ts.Symbol,
    at: ts.Node,
  ): ApiBlock | null {
    const signatures = callSignaturesOf(type);
    if (signatures.length === 0) return null;

    const first = signatures[0] as ts.Signature;
    const param = first.getParameters()[0];
    const looksLikeComponent = /^[A-Z]/.test(name.split(".").pop() ?? name);
    const decl = symbol.valueDeclaration ?? symbol.declarations?.[0];
    const defaults = implementationDefaults(decl);

    if (looksLikeComponent && param) {
      const propsType = checker.getTypeOfSymbolAtLocation(param, param.valueDeclaration ?? at);
      const split = splitProps(propsType, at, defaults);
      return {
        name,
        kind: "component",
        description: describe(symbol),
        ...split,
        signatures: [],
        members: [],
        parts: [],
      };
    }

    // A function or hook: print the signatures and, when it returns an object,
    // that object's members.
    const returned = first.getReturnType();
    const members: ApiProp[] = [];
    if (returned.flags & ts.TypeFlags.Object) {
      for (const prop of checker.getPropertiesOfType(returned)) {
        members.push(toProp(prop, !(prop.flags & ts.SymbolFlags.Optional), at, new Map()));
      }
    }

    return {
      name,
      kind: "function",
      description: describe(symbol),
      props: [],
      inherited: [],
      signatures: signatures.map((s) =>
        checker.signatureToString(s, at, ts.TypeFormatFlags.NoTruncation),
      ),
      members,
      parts: [],
    };
  }

  return {
    extract(file, exportName) {
      const source = program.getSourceFile(file);
      const exported = exportSymbol(file, exportName);
      if (!source || !exported) return null;
      const symbol =
        exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;

      const type = checker.getTypeOfSymbolAtLocation(symbol, source);
      const block = extractBlock(exportName, type, symbol, source);
      if (!block) return null;
      // A wrapper may re-export an upstream function with its own usage contract.
      block.description = describe(exported) || block.description;

      // Compound parts hang off the root as static properties: Table.Head.
      // Skip them for plain functions, whose own properties are methods.
      if (block.kind === "component") {
        const parts: ApiBlock[] = [];
        for (const prop of checker.getPropertiesOfType(type)) {
          if (SKIPPED_MEMBERS.has(prop.name) || !/^[A-Z]/.test(prop.name)) continue;
          const partType = checker.getTypeOfSymbolAtLocation(prop, source);
          const part = extractBlock(`${exportName}.${prop.name}`, partType, prop, source);
          if (part) parts.push(part);
        }
        parts.sort((a, b) => a.name.localeCompare(b.name));
        block.parts = parts;
      }
      return block;
    },
  };
}

// ─── the site's extractor ─────────────────────────────────────────────────────

interface SiteCache {
  key: string;
  extractor: ApiExtractor;
  blocks: Map<string, ApiBlock | null>;
}

const GLOBAL_KEY = "__nebutraDesignApiExtractor";

function uiTsconfig(): string {
  const path = resolve(UI_SRC, "..", "tsconfig.json");
  if (!existsSync(path)) {
    throw new Error(`[apps/design] Expected the ui package tsconfig at ${path}.`);
  }
  return path;
}

function siteCache(entries: readonly ComponentEntry[]): SiteCache {
  const roots = [...new Set(entries.map((entry) => resolve(UI_SRC, entry.entry)))].sort();
  const key = roots.join("|");
  const store = globalThis as unknown as Record<string, SiteCache | undefined>;
  const cached = store[GLOBAL_KEY];
  if (cached && cached.key === key) return cached;

  const fresh: SiteCache = {
    key,
    extractor: createApiExtractor({ roots, tsconfigPath: uiTsconfig(), ownRoot: UI_SRC }),
    blocks: new Map(),
  };
  store[GLOBAL_KEY] = fresh;
  return fresh;
}

export interface EntryApi {
  /** One block per documented export, in the order the registry lists them. */
  blocks: ApiBlock[];
  /** Registry `covers` names that did not resolve to a component or function. */
  unresolved: string[];
}

/** The API of every export a component page covers. */
export function apiForEntry(
  entry: ComponentEntry,
  allEntries: readonly ComponentEntry[],
): EntryApi {
  const cache = siteCache(allEntries);
  const file = resolve(UI_SRC, entry.entry);
  const blocks: EntryApi["blocks"] = [];
  const unresolved: string[] = [];

  for (const name of entry.covers) {
    // cva helpers are documented by the derived variant summary, not here.
    if (name.endsWith("Variants")) continue;

    const cacheKey = `${file}#${name}`;
    let block = cache.blocks.get(cacheKey);
    if (block === undefined) {
      block = cache.extractor.extract(file, name);
      cache.blocks.set(cacheKey, block);
    }
    if (block) blocks.push(block);
    else unresolved.push(name);
  }

  return { blocks, unresolved };
}
