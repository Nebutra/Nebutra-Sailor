/**
 * Converts every SVG in src/svg/ into a TypeScript React component in src/components/
 * and generates the barrel src/index.ts.
 *
 * Run:  pnpm --filter @nebutra/icons generate
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { transform } from "@svgr/core";

const SVG_DIR = join(__dirname, "../src/svg");
const OUT_DIR = join(__dirname, "../src/components");
const INDEX_PATH = join(__dirname, "../src/index.ts");

/** "arrow-down" → "ArrowDown" */
function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

const SVGR_CONFIG = {
  plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
  typescript: true,
  ref: true,
  icon: true, // uses 1em for width/height, supports size via font-size
  svgoConfig: {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false,
            cleanupIds: false,
          },
        },
      },
    ],
  },
  // Use tpl-based template — jsx is an AST node, NOT a string
  template: (
    variables: {
      imports: unknown;
      interfaces: unknown;
      componentName: string;
      props: unknown;
      jsx: unknown;
      exports: unknown;
    },
    { tpl }: { tpl: (...args: unknown[]) => unknown },
  ) => {
    // Hardcode only the imports we actually use — avoids unused SVGProps/Ref lint errors
    return tpl`
import * as React from "react";
import { forwardRef } from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}

const ${variables.componentName} = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    ${variables.jsx}
  )
);
${variables.componentName}.displayName = "${variables.componentName}";

export { ${variables.componentName} };
export default ${variables.componentName};
`;
  },
  // Props to pass to the root SVG — size controls both width and height
  svgProps: {
    width: "{width ?? size}",
    height: "{height ?? size}",
    ref: "{ref}",
  },
};

/**
 * Remove duplicate keys from JSX style objects (TS1117 fix).
 * Some SVGs encode P3 wide-gamut colors as: fill: "#hex"; fill: color(display-p3 ...)
 * SVGR preserves both, producing duplicate object keys. Keep the last occurrence.
 */
function removeDuplicateStyleKeys(code: string): string {
  const lines = code.split("\n");
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (next) {
      const cur = line.match(/^(\s*)(\w+):\s*"[^"]*",\s*$/);
      const nxt = next.match(/^(\s*)(\w+):\s*/);
      if (cur && nxt && cur[2] === nxt[2]) {
        continue; // skip: duplicate key, keep the next line
      }
    }
    result.push(line);
  }
  return result.join("\n");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const svgFiles = (await readdir(SVG_DIR)).filter((f) => f.endsWith(".svg")).sort();

  const exportLines: string[] = [];
  let skipped = 0;

  for (const file of svgFiles) {
    const name = basename(file, ".svg");
    const componentName = toPascalCase(name);
    const svgContent = await readFile(join(SVG_DIR, file), "utf-8");

    let code: string;
    try {
      code = await transform(svgContent, SVGR_CONFIG as Parameters<typeof transform>[1], {
        componentName,
        filePath: join(SVG_DIR, file),
      });
      code = removeDuplicateStyleKeys(code);
    } catch (_err) {
      skipped++;
      continue;
    }

    const outFile = join(OUT_DIR, `${componentName}.tsx`);
    await writeFile(outFile, code, "utf-8");
    exportLines.push({ name, componentName });
  }

  // Build barrel index
  const lines = [
    "// Auto-generated — do not edit manually.",
    "// Source: vercel.com/geist/icons  |  Run: pnpm --filter @nebutra/icons generate",
    "",
    'export type { IconProps } from "./components/' + exportLines[0].componentName + '";',
    "",
    ...exportLines.map(
      ({ componentName }) => `export { ${componentName} } from "./components/${componentName}";`,
    ),
    "",
  ].join("\n");

  await writeFile(INDEX_PATH, lines, "utf-8");

  process.stdout.write(
    `✅ Generated ${exportLines.length} components (${skipped} skipped) → src/components/\n`,
  );
  process.stdout.write(`✅ Wrote src/index.ts with ${exportLines.length} named exports\n`);
}

main().catch((_e) => {
  process.exit(1);
});
