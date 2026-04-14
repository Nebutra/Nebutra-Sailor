// source.config.ts
import { remarkFeedbackBlock } from "fumadocs-core/mdx-plugins/remark-feedback-block";
import { defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";
import { remarkMdxMermaid } from "fumadocs-mermaid";
import {
  createFileSystemGeneratorCache,
  createGenerator,
  remarkAutoTypeTable
} from "fumadocs-typescript";
import { z } from "zod";

// lib/remark-component.ts
import fs from "node:fs";
import path from "node:path";
import { visit } from "unist-util-visit";
var _fileMap = null;
function getFileMap(root) {
  if (_fileMap) return _fileMap;
  const mapPath = path.join(root, "src", "__registry__", "file-map.json");
  try {
    _fileMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  } catch {
    _fileMap = {};
  }
  return _fileMap ?? {};
}
function toPascalCase(kebab) {
  return kebab.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}
function extractImports(source) {
  const importLines = [];
  const lines = source.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^import\s/.test(line) || /^"use client"/.test(line) || /^'use client'/.test(line)) {
      let importBlock = line;
      while (!importBlock.includes(";") && i + 1 < lines.length) {
        i++;
        importBlock += "\n" + lines[i];
      }
      importLines.push(importBlock);
    }
    i++;
  }
  return importLines.join("\n");
}
function extractComponentCode(source, componentName) {
  const pascalName = toPascalCase(componentName);
  const startPatterns = [
    `export function ${pascalName}`,
    `export default function ${pascalName}`,
    `export const ${pascalName}`
  ];
  let startIdx = -1;
  for (const pattern of startPatterns) {
    const idx = source.indexOf(pattern);
    if (idx !== -1) {
      startIdx = idx;
      break;
    }
  }
  if (startIdx === -1) return source;
  const exportCount = (source.match(/^export\s+(function|const|default)/gm) ?? []).length;
  if (exportCount <= 1) return source;
  let braceDepth = 0;
  let foundOpenBrace = false;
  let endIdx = startIdx;
  for (let i = startIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      braceDepth++;
      foundOpenBrace = true;
    } else if (ch === "}") {
      braceDepth--;
      if (foundOpenBrace && braceDepth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  if (!foundOpenBrace || endIdx === startIdx) return source;
  const componentCode = source.slice(startIdx, endIdx).trimEnd();
  const imports = extractImports(source);
  return `${imports}

${componentCode}`;
}
function remarkComponent() {
  return (tree) => {
    const root = process.cwd().endsWith("apps/design-docs") ? process.cwd() : path.join(process.cwd(), "apps/design-docs");
    const previewsDir = path.join(root, "src", "components", "previews");
    const fileMap = getFileMap(root);
    visit(tree, (node) => {
      if (node.name !== "ComponentPreview") return;
      const nameAttr = node.attributes?.find((a) => a.name === "name");
      const name = nameAttr?.value;
      if (!name) return;
      const candidates = [`${name}.tsx`, fileMap[name] ? `${fileMap[name]}.tsx` : null].filter(
        Boolean
      );
      let rawSource = null;
      for (const candidate of candidates) {
        const sourcePath = path.join(previewsDir, candidate);
        if (fs.existsSync(sourcePath)) {
          const fullSource = fs.readFileSync(sourcePath, "utf8");
          rawSource = extractComponentCode(fullSource, name);
          break;
        }
      }
      if (rawSource) {
        node.attributes.push({
          type: "mdxJsxAttribute",
          name: "code",
          value: rawSource
        });
      } else {
      }
    });
  };
}

// source.config.ts
var generator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript")
});
var docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      status: z.enum(["stable", "beta", "deprecated", "experimental"]).optional(),
      figma: z.string().optional()
    }),
    postprocess: {
      includeProcessedMarkdown: true
    }
  }
});
var source_config_default = defineConfig({
  mdxOptions: {
    remarkPlugins: [
      remarkComponent,
      remarkMdxMermaid,
      remarkFeedbackBlock,
      [remarkAutoTypeTable, { generator }]
    ],
    rehypePlugins: []
  }
});
export {
  source_config_default as default,
  docs
};
