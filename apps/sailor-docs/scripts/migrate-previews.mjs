import fs from "node:fs/promises";
import { glob } from "glob";

/**
 * Migration Script: Live Component Previews
 *
 * This script automates the process of wrapping raw JSX code blocks in MDX files
 * with `<ComponentPreview>`. This provides a scalable pattern for rolling out
 * interactive live previews across the remaining 130+ Nebutra UI components.
 *
 * Usage:
 * node scripts/migrate-previews.mjs
 */
async function main() {
  // Find all component documentation files
  const files = await glob("content/docs/components/**/*.mdx");

  let _modifiedCount = 0;

  for (const file of files) {
    const originalContent = await fs.readFile(file, "utf8");
    let content = originalContent;

    // Pattern 1: Pure JSX blocks (starts directly with `<`)
    content = content.replace(/```tsx\n(<[A-Z][\s\S]*?)```/g, (match, jsxCode) => {
      if (jsxCode.includes("ComponentPreview")) return match;

      const indented = jsxCode
        .split("\n")
        .map((l) => (l ? "  " + l : l))
        .join("\n")
        .replace(/\s+$/, "");
      return `\`\`\`tsx\n<ComponentPreview className="min-h-[200px] flex justify-center items-center w-full p-10">\n${indented}\n</ComponentPreview>\n\`\`\``;
    });

    // Pattern 2: Blocks starting with imports, then JSX
    content = content.replace(
      /```tsx\n(import [\s\S]*?\n\n)(<[\s\S]*?)```/g,
      (match, imports, jsxCode) => {
        if (jsxCode.includes("ComponentPreview")) return match;

        const indented = jsxCode
          .split("\n")
          .map((l) => (l ? "  " + l : l))
          .join("\n")
          .replace(/\s+$/, "");
        return `\`\`\`tsx\n${imports}<ComponentPreview className="min-h-[200px] flex justify-center items-center w-full p-10">\n${indented}\n</ComponentPreview>\n\`\`\``;
      },
    );

    if (content !== originalContent) {
      await fs.writeFile(file, content, "utf8");
      _modifiedCount++;
    }
  }
}

// Run the script
main().catch(console.error);
