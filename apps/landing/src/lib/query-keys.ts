export const queryKeys = {
  blogComments: {
    all: ["blog-comments"] as const,
    detail: (input: { language: "en" | "zh"; slug: string; translationKey: string }) =>
      ["blog-comments", input.language, input.slug, input.translationKey] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
