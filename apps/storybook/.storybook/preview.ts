import type { Preview, StoryContext, StoryFn } from "@storybook/react";
// Single stylesheet — Tailwind v4 + tokens + fonts + @source scan directives.
import "./preview.css";
import { a11yConfig } from "./a11y-config";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "var(--neutral-1)" },
        { name: "dark", value: "var(--neutral-12)" },
        { name: "neutral", value: "var(--neutral-2)" },
      ],
    },
    docs: {
      theme: undefined,
    },
    a11y: a11yConfig,
  },

  globalTypes: {
    theme: {
      description: "Light / Dark theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },

  decorators: [
    (Story: StoryFn, context: StoryContext) => {
      const theme = context.globals.theme as string;
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
      return Story(context.args, context);
    },
  ],
};

export default preview;
