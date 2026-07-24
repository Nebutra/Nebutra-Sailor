import { brand } from "@nebutra/brand/metadata";
import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";

export default defineConfig({
  name: "nebutra-studio",
  title: `${brand.name} Studio`,

  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "wyfqr24v",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",

  plugins: [structureTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },
});
