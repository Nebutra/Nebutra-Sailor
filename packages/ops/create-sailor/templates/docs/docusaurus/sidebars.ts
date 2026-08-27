import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    "intro",
    {
      type: "category",
      label: "Getting started",
      items: ["getting-started/install", "getting-started/develop"],
    },
  ],
};

export default sidebars;
