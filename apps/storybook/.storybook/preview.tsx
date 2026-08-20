import type { Preview, StoryContext, StoryFn } from "@storybook/react";
import { NextIntlClientProvider } from "next-intl";
// Single stylesheet — Tailwind v4 + tokens + fonts + @source scan directives.
import "./preview.css";
import enMessages from "../../../packages/platform/i18n/locales/en.json";
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

    // Any story reaching a component that calls `useTranslations` throws
    // without this — and the throw is caught by Storybook's error boundary, so
    // the build succeeds, the story is indexed, and the frame renders the
    // error text instead of the component. Two Startup OS stories shipped that
    // way. Real `en` copy, not key echoes, so a visual review sees real strings.
    (Story: StoryFn, context: StoryContext) => (
      <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
        {Story(context.args, context)}
      </NextIntlClientProvider>
    ),
  ],
};

export default preview;
