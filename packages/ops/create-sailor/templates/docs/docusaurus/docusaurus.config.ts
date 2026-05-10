import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  title: "{PRODUCT_NAME}",
  tagline: "Documentation for {PRODUCT_NAME}",
  favicon: "img/favicon.ico",

  url: "https://docs.example.com",
  baseUrl: "/",

  organizationName: "your-org",
  projectName: "your-repo",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/your-org/your-repo/tree/main/docs/",
          routeBasePath: "/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/social-card.png",
    navbar: {
      title: "{PRODUCT_NAME}",
      logo: { alt: "{PRODUCT_NAME}", src: "img/logo.svg" },
      items: [
        { type: "docSidebar", sidebarId: "tutorialSidebar", position: "left", label: "Docs" },
        {
          href: "https://github.com/your-org/your-repo",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      copyright: "Copyright © " + new Date().getFullYear() + " {PRODUCT_NAME}.",
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
