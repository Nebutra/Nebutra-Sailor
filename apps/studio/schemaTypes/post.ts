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
      name: "body",
      title: "Body",
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            annotations: [
              {
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  defineField({
                    name: "href",
                    title: "URL",
                    type: "url",
                    validation: (Rule) => Rule.required(),
                  }),
                ],
              },
            ],
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
              { title: "Code", value: "code" },
              { title: "Inline math", value: "mathInline" },
            ],
          },
        },
        {
          name: "mathBlock",
          title: "Math",
          type: "object",
          fields: [
            defineField({
              name: "math",
              title: "LaTeX",
              type: "text",
              rows: 6,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              math: "math",
            },
            prepare(selection) {
              return {
                title: "Math",
                subtitle:
                  typeof selection.math === "string"
                    ? selection.math.split("\n")[0]?.slice(0, 80)
                    : "LaTeX",
              };
            },
          },
        },
        {
          name: "mermaid",
          title: "Mermaid diagram",
          type: "object",
          fields: [
            defineField({
              name: "code",
              title: "Mermaid",
              type: "text",
              rows: 12,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              code: "code",
            },
            prepare(selection) {
              return {
                title: "Mermaid diagram",
                subtitle:
                  typeof selection.code === "string"
                    ? selection.code.split("\n")[0]?.slice(0, 80)
                    : "Diagram",
              };
            },
          },
        },
        {
          name: "code",
          title: "Code",
          type: "object",
          fields: [
            defineField({
              name: "code",
              title: "Code",
              type: "text",
              rows: 12,
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "language",
              title: "Language",
              type: "string",
              initialValue: "text",
            }),
            defineField({
              name: "filename",
              title: "Filename",
              type: "string",
            }),
            defineField({
              name: "highlightedLines",
              title: "Highlighted lines",
              type: "array",
              of: [{ type: "number" }],
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
                title: filename || `${language || "text"} code`,
                subtitle: typeof code === "string" ? code.split("\n")[0]?.slice(0, 80) : "Code",
              };
            },
          },
        },
        {
          name: "table",
          title: "Table",
          type: "object",
          fields: [
            defineField({
              name: "rows",
              title: "Rows",
              type: "array",
              of: [
                {
                  name: "tableRow",
                  title: "Table row",
                  type: "object",
                  fields: [
                    defineField({
                      name: "cells",
                      title: "Cells",
                      type: "array",
                      of: [{ type: "string" }],
                    }),
                  ],
                },
              ],
            }),
          ],
          preview: {
            select: {
              rows: "rows",
            },
            prepare(selection) {
              const rowCount = Array.isArray(selection.rows) ? selection.rows.length : 0;
              return {
                title: "Table",
                subtitle: `${rowCount} row${rowCount === 1 ? "" : "s"}`,
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
