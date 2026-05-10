import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);

function getAbsolutePath(value: string): string {
  return dirname(require.resolve(`${value}/package.json`));
}

const config: StorybookConfig = {
  stories: [
    // Stories co-located with ui components
    "../../../packages/design/ui/src/**/*.stories.@(ts|tsx)",
    // Local stories for docs/layout demos
    "../src/stories/**/*.stories.@(ts|tsx)",
  ],

  addons: [
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-interactions"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-a11y"),
  ],

  framework: {
    name: getAbsolutePath("@storybook/react-vite") as "@storybook/react-vite",
    options: {},
  },

  docs: {
    autodocs: "tag",
  },
};

export default config;
