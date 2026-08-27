import { createFileSystemCache, defineStoryFactory } from "@fumadocs/story";

export const { defineStory } = defineStoryFactory({
  // For Vercel deployments, cache the story data in .next/fumadocs-story
  cache:
    process.env.NODE_ENV === "production"
      ? createFileSystemCache(".next/fumadocs-story")
      : undefined,
  tsc: {
    // TypeScript options for generating controls from types
  },
});
