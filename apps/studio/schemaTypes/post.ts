import { defineField, defineType } from "sanity";

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "language",
      title: "Language",
      type: "string",
      initialValue: "en",
      options: {
        layout: "radio",
        list: [
          { title: "English", value: "en" },
          { title: "Chinese", value: "zh" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "translationKey",
      title: "Translation key",
      type: "string",
      description:
        "Shared stable key for localized versions of the same article, for example nebutra-sailor-why-exists.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
    }),
    defineField({
      name: "mainImage",
      title: "Main image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "reference", to: { type: "category" } }],
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "contentSource",
      title: "Content source",
      type: "object",
      description: "Editorial provenance for originals, commentary, and authorized syndication.",
      fields: [
        defineField({
          name: "kind",
          title: "Kind",
          type: "string",
          initialValue: "original",
          options: {
            layout: "radio",
            list: [
              { title: "Nebutra Originals", value: "original" },
              { title: "Nebutra Commentary", value: "commentary" },
              { title: "Authorized Syndication", value: "syndicated" },
            ],
          },
        }),
        defineField({
          name: "originalTitle",
          title: "Original title",
          type: "string",
          hidden: ({ parent }) => parent?.kind === "original",
        }),
        defineField({
          name: "originalUrl",
          title: "Original URL",
          type: "url",
          hidden: ({ parent }) => parent?.kind === "original",
        }),
        defineField({
          name: "originalAuthor",
          title: "Original author",
          type: "string",
          hidden: ({ parent }) => parent?.kind === "original",
        }),
        defineField({
          name: "publisher",
          title: "Publisher / organization",
          type: "string",
          hidden: ({ parent }) => parent?.kind === "original",
        }),
        defineField({
          name: "license",
          title: "License / permission note",
          type: "string",
          description: "For example: CC BY 4.0, authorized republication, excerpt/commentary.",
          hidden: ({ parent }) => parent?.kind === "original",
        }),
        defineField({
          name: "canonicalUrl",
          title: "Canonical URL",
          type: "url",
          description:
            "Optional SEO canonical override. Use the original source for authorized full syndication.",
          hidden: ({ parent }) => parent?.kind === "original",
        }),
      ],
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        {
          name: "code",
          title: "Code block",
          type: "object",
          fields: [
            defineField({
              name: "language",
              title: "Language",
              type: "string",
              description: "Syntax language, for example tsx, bash, json, or text.",
            }),
            defineField({
              name: "filename",
              title: "Filename",
              type: "string",
            }),
            defineField({
              name: "code",
              title: "Code",
              type: "text",
              rows: 12,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              code: "code",
              filename: "filename",
              language: "language",
            },
            prepare(selection) {
              const { code, filename, language } = selection;
              return {
                title: filename || language || "Code block",
                subtitle: typeof code === "string" ? code.split("\n")[0] : undefined,
              };
            },
          },
        },
        {
          type: "image",
          options: { hotspot: true },
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      language: "language",
      media: "mainImage",
    },
    prepare(selection) {
      const { author, language } = selection;
      return {
        ...selection,
        subtitle: [language?.toUpperCase(), author && `by ${author}`].filter(Boolean).join(" · "),
      };
    },
  },
});
