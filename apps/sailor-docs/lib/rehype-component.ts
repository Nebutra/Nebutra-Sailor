import fs from "node:fs";
import path from "node:path";
import type { Node } from "unist";
import { visit } from "unist-util-visit";

interface MdxJsxAttribute {
  type: string;
  name: string;
  value: string;
}

interface MdxJsxFlowElement extends Node {
  name?: string;
  attributes?: MdxJsxAttribute[];
}

/**
 * Rehype plugin to extract code from files and inject it into `<ComponentPreview>`
 */
export function rehypeComponent() {
  return (tree: Node) => {
    visit(tree, (node: Node) => {
      const mdxNode = node as MdxJsxFlowElement;
      // Look for `<ComponentPreview>` nodes which are MDX flow elements
      if (mdxNode.name === "ComponentPreview") {
        // Find the 'name' attribute
        const nameAttr = mdxNode.attributes?.find((attr) => attr.name === "name");
        const name = nameAttr?.value;

        if (!name) {
          return;
        }

        try {
          // Attempt to find the source file in our previews directory
          const sourcePath = path.join(
            process.cwd(),
            process.cwd().endsWith("apps/design-docs") ? "" : "apps/design-docs",
            "src",
            "components",
            "previews",
            `${name}.tsx`,
          );

          if (fs.existsSync(sourcePath)) {
            const rawSource = fs.readFileSync(sourcePath, "utf8");

            // Inject the raw source string as a property called `code` into the React component
            // For mdxJsxFlowElement, properties are in 'attributes' array
            mdxNode.attributes?.push({
              type: "mdxJsxAttribute",
              name: "code",
              value: rawSource,
            });

            // We do NOT inject node.children here, because FumaDocs MDX will compile it to a weird React node
            // that bypasses our ComponentPreview filters. We'll let ComponentPreview render the `code` string securely.
          } else {
          }
        } catch (error) {
          console.error(
            `[rehypeComponent] Failed to process ComponentPreview name=${name}:`,
            error,
          );
        }
      }
    });
  };
}
