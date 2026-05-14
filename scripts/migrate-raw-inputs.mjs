#!/usr/bin/env node

// Codemod: raw <input type="text|email|password|tel|url|number|search"|<textarea>
// → @nebutra/ui/primitives <Input>/<Textarea>.
//
// Skips: type="hidden|file|checkbox|radio|submit|reset|button", <select> (needs JSX restructure),
// `data-allow-native` opt-out, files in storybook stories, tests.
//
// Run from repo root: node scripts/migrate-raw-inputs.mjs [--dry]

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const dryRun = process.argv.includes("--dry");
const TEXT_TYPES = new Set([
  "text",
  "email",
  "password",
  "tel",
  "url",
  "number",
  "search",
  "date",
  "datetime-local",
  "time",
  "month",
  "week",
]);

const filesRaw = execSync(
  `grep -rlE "<(input|textarea)\\b" --include='*.tsx' apps packages 2>/dev/null | grep -v node_modules | grep -v dist/ | grep -v build/ | grep -v '/.next/' | grep -v 'storybook/src/stories/' | grep -v test`,
  { encoding: "utf-8" },
).trim();
const files = filesRaw.split("\n").filter(Boolean);

const stats = {
  migratedFiles: 0,
  inputs: 0,
  textareas: 0,
  skipped: { hidden: 0, file: 0, checkbox: 0, radio: 0, optedOut: 0, other: 0 },
};

const detectType = (attrsBlock) => {
  const m = attrsBlock.match(/\btype=["']([a-z]+)["']/);
  return m ? m[1] : "text";
};

const stripClassNameAttr = (attrsBlock) => {
  // Drop className=`...` or className="..." (single line) — Input/Textarea have their own styling
  return attrsBlock.replace(/\s+className=(?:"[^"]*"|'[^']*'|\{[^{}]+\}|`[^`]*`)/g, "");
};

const hasOptOut = (attrsBlock) => /\bdata-allow-native(=|\s|$)/.test(attrsBlock);

const processFile = (file) => {
  let src = readFileSync(file, "utf-8");
  const before = src;
  let needsInput = false;
  let needsTextarea = false;

  // Process <input ... /> (single or multi-line, self-closing).
  // attrs match handles JSX `{...}` expressions which may contain `>` (e.g. arrow funcs).
  // Two-level brace tolerance covers the common cases without a full parser.
  src = src.replace(/<input\b((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)\s*\/>/gs, (full, attrs) => {
    if (hasOptOut(attrs)) {
      stats.skipped.optedOut += 1;
      return full;
    }
    const t = detectType(attrs);
    if (t === "hidden") {
      stats.skipped.hidden += 1;
      return full;
    }
    if (t === "file") {
      stats.skipped.file += 1;
      return full;
    }
    if (t === "checkbox") {
      stats.skipped.checkbox += 1;
      return full;
    }
    if (t === "radio") {
      stats.skipped.radio += 1;
      return full;
    }
    if (!TEXT_TYPES.has(t)) {
      stats.skipped.other += 1;
      return full;
    }
    needsInput = true;
    stats.inputs += 1;
    return `<Input${stripClassNameAttr(attrs)}/>`;
  });

  // Process <textarea ... /> self-closing
  src = src.replace(
    /<textarea\b((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)\s*\/>/gs,
    (full, attrs) => {
      if (hasOptOut(attrs)) {
        stats.skipped.optedOut += 1;
        return full;
      }
      needsTextarea = true;
      stats.textareas += 1;
      return `<Textarea${stripClassNameAttr(attrs)}/>`;
    },
  );

  // Process <textarea ... ></textarea> (open/close form)
  src = src.replace(
    /<textarea\b((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)>([\s\S]*?)<\/textarea>/g,
    (full, attrs, body) => {
      if (hasOptOut(attrs)) {
        stats.skipped.optedOut += 1;
        return full;
      }
      needsTextarea = true;
      stats.textareas += 1;
      return `<Textarea${stripClassNameAttr(attrs)}>${body}</Textarea>`;
    },
  );

  if (src === before) return false;

  // Inject imports (best-effort — assumes file already imports something from @nebutra/ui/primitives or has any import)
  const newImports = [];
  if (
    needsInput &&
    !/from\s+["']@nebutra\/ui\/primitives["']/.test(
      src.match(
        /^[\s\S]*?\n[\s\S]*?import[\s\S]*?from[\s\S]*?Input[\s\S]*?@nebutra\/ui\/primitives/m,
      )?.[0] ?? "",
    )
  ) {
    if (!/import\s*\{[^}]*\bInput\b[^}]*\}\s*from\s*["']@nebutra\/ui\/primitives["']/.test(src)) {
      newImports.push("Input");
    }
  }
  if (
    needsTextarea &&
    !/import\s*\{[^}]*\bTextarea\b[^}]*\}\s*from\s*["']@nebutra\/ui\/primitives["']/.test(src)
  ) {
    newImports.push("Textarea");
  }
  if (newImports.length > 0) {
    // Files inside packages/design/ui/src/primitives must import siblings via relative path
    // to avoid self-referential package import.
    const isPrimitiveSibling = /packages\/design\/ui\/src\/primitives\//.test(file);
    if (isPrimitiveSibling) {
      // Skip if file IS the primitive itself (e.g. input.tsx exports Input)
      const filtered = newImports.filter((n) => {
        const sibling = `${n.toLowerCase()}.tsx`;
        if (file.endsWith(`/${sibling}`)) return false;
        // Skip if file already declares the name (e.g. has its own local Textarea/Input const)
        if (new RegExp(`(?:const|function|class|let|var)\\s+${n}\\b`).test(src)) return false;
        return true;
      });
      if (filtered.length === 0) return false;
      const siblingImports = filtered
        .map((n) => `import { ${n} } from "./${n.toLowerCase()}";`)
        .join("\n");
      src = src.replace(
        /^(.*?\n)((?:import [\s\S]*?from [^\n]+;\n)+)/m,
        (full, prefix, importBlock) => `${prefix}${importBlock}${siblingImports}\n`,
      );
    } else {
      // Try to merge into existing @nebutra/ui/primitives import
      const primitivesImportMatch = src.match(
        /import\s*\{([^}]+)\}\s*from\s*["']@nebutra\/ui\/primitives["']/s,
      );
      if (primitivesImportMatch) {
        const existing = primitivesImportMatch[1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const merged = [...new Set([...existing, ...newImports])].sort();
        src = src.replace(
          primitivesImportMatch[0],
          `import { ${merged.join(", ")} } from "@nebutra/ui/primitives"`,
        );
      } else {
        // Insert after the FULL first import (handles multi-line `import { ... }` blocks)
        const firstImportMatch = src.match(
          /^(?:"use client";\s*\n+)?(import\s+(?:type\s+)?(?:\{[\s\S]*?\}|\*\s+as\s+\w+|\w+)\s+from\s+["'][^"']+["'];?\s*\n)/,
        );
        if (firstImportMatch) {
          src = src.replace(
            firstImportMatch[0],
            `${firstImportMatch[0]}import { ${newImports.join(", ")} } from "@nebutra/ui/primitives";\n`,
          );
        } else {
          // Fallback: prepend
          src = `import { ${newImports.join(", ")} } from "@nebutra/ui/primitives";\n${src}`;
        }
      }
    }
  }

  if (!dryRun) writeFileSync(file, src, "utf-8");
  stats.migratedFiles += 1;
  return true;
};

for (const file of files) {
  try {
    processFile(file);
  } catch (e) {
    console.error(`Error in ${file}:`, e.message);
  }
}

console.log(`\n${dryRun ? "[DRY-RUN] " : ""}Migrated ${stats.migratedFiles} file(s)`);
console.log(`  ${stats.inputs} <input> → <Input>`);
console.log(`  ${stats.textareas} <textarea> → <Textarea>`);
console.log(`Skipped:`, stats.skipped);
