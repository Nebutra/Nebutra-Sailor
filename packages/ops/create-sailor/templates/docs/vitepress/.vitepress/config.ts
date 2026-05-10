import { defineConfig } from "vitepress";

export default defineConfig({
  title: "{PRODUCT_NAME}",
  description: "Documentation for {PRODUCT_NAME}",
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/introduction" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Getting started", link: "/guide/getting-started" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/your-org/your-repo" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © " + new Date().getFullYear() + " {PRODUCT_NAME}",
    },

    search: { provider: "local" },
  },
});
