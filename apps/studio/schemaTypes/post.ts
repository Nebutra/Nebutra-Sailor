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
          styles: [
            { title: "Normal", value: "normal" },
            { title: "H2", value: "h2" },
            { title: "H3", value: "h3" },
            { title: "H4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
          marks: {
            annotations: [
              {
                name: "link",
                title: "Link",
                type: "object",
                fields: [
                  defineField({
                    name: "href",
                    title: "URL or anchor",
                    type: "string",
                    validation: (Rule) =>
                      Rule.required().custom((value) => {
                        if (typeof value !== "string") return "Required";
                        if (/^(https?:\/\/|\/|#)/.test(value)) return true;
                        return "Use an absolute URL, root-relative URL, or #anchor.";
                      }),
                  }),
                  defineField({
                    name: "label",
                    title: "Accessible label",
                    type: "string",
                  }),
                  defineField({
                    name: "openInNewTab",
                    title: "Open in new tab",
                    type: "boolean",
                    initialValue: false,
                  }),
                ],
              },
              {
                name: "citation",
                title: "Citation",
                type: "object",
                fields: [
                  defineField({
                    name: "refNumber",
                    title: "Reference number",
                    type: "number",
                    validation: (Rule) => Rule.required().integer().positive(),
                  }),
                  defineField({
                    name: "href",
                    title: "Reference anchor",
                    type: "string",
                    validation: (Rule) => Rule.required(),
                  }),
                ],
              },
              {
                name: "footnote",
                title: "Footnote",
                type: "object",
                fields: [
                  defineField({
                    name: "note",
                    title: "Note",
                    type: "text",
                    rows: 3,
                    validation: (Rule) => Rule.required(),
                  }),
                ],
              },
              {
                name: "anchor",
                title: "Anchor link",
                type: "object",
                fields: [
                  defineField({
                    name: "id",
                    title: "Anchor ID",
                    type: "string",
                    validation: (Rule) =>
                      Rule.required().regex(/^[a-z0-9][a-z0-9-]*$/, {
                        name: "slug-like anchor",
                      }),
                  }),
                ],
              },
            ],
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
              { title: "Code", value: "code" },
              { title: "Inline math", value: "mathInline" },
              { title: "Highlight", value: "highlight" },
              { title: "Keyboard", value: "kbd" },
              { title: "Superscript", value: "sup" },
              { title: "Subscript", value: "sub" },
            ],
          },
          of: [
            {
              name: "inlineBadge",
              title: "Inline badge",
              type: "object",
              fields: [
                defineField({
                  name: "label",
                  title: "Label",
                  type: "string",
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: "tone",
                  title: "Tone",
                  type: "string",
                  initialValue: "neutral",
                  options: {
                    list: [
                      { title: "Neutral", value: "neutral" },
                      { title: "Blue", value: "blue" },
                      { title: "Success", value: "success" },
                      { title: "Warning", value: "warning" },
                      { title: "Danger", value: "danger" },
                    ],
                  },
                }),
              ],
            },
          ],
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
          name: "ctaBlock",
          title: "CTA",
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "body",
              title: "Body",
              type: "text",
              rows: 4,
            }),
            defineField({
              name: "items",
              title: "Items",
              type: "array",
              of: [
                {
                  name: "ctaItem",
                  title: "CTA item",
                  type: "object",
                  fields: [
                    defineField({
                      name: "title",
                      title: "Title",
                      type: "string",
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "body",
                      title: "Body",
                      type: "text",
                      rows: 2,
                    }),
                  ],
                },
              ],
            }),
            defineField({
              name: "ctaLabel",
              title: "Button label",
              type: "string",
            }),
            defineField({
              name: "ctaHref",
              title: "Button href",
              type: "string",
            }),
          ],
          preview: {
            select: {
              title: "title",
              ctaLabel: "ctaLabel",
            },
            prepare(selection) {
              return {
                title: selection.title || "CTA",
                subtitle: selection.ctaLabel,
              };
            },
          },
        },
        {
          name: "calloutBlock",
          title: "Callout",
          type: "object",
          fields: [
            defineField({
              name: "tone",
              title: "Tone",
              type: "string",
              initialValue: "note",
              options: {
                list: [
                  { title: "Note", value: "note" },
                  { title: "Insight", value: "insight" },
                  { title: "Warning", value: "warning" },
                  { title: "Success", value: "success" },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
            }),
            defineField({
              name: "body",
              title: "Body",
              type: "text",
              rows: 4,
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: "title", tone: "tone", body: "body" },
            prepare(selection) {
              return {
                title: selection.title || `${selection.tone || "Callout"} callout`,
                subtitle: typeof selection.body === "string" ? selection.body.slice(0, 90) : "",
              };
            },
          },
        },
        {
          name: "quoteBlock",
          title: "Editorial quote",
          type: "object",
          fields: [
            defineField({
              name: "quote",
              title: "Quote",
              type: "text",
              rows: 5,
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "attribution",
              title: "Attribution",
              type: "string",
            }),
            defineField({
              name: "sourceHref",
              title: "Source URL",
              type: "url",
            }),
          ],
          preview: {
            select: { quote: "quote", attribution: "attribution" },
            prepare(selection) {
              return {
                title: typeof selection.quote === "string" ? selection.quote.slice(0, 80) : "Quote",
                subtitle: selection.attribution,
              };
            },
          },
        },
        {
          name: "statGrid",
          title: "Stat grid",
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
            }),
            defineField({
              name: "items",
              title: "Stats",
              type: "array",
              validation: (Rule) => Rule.required().min(1).max(6),
              of: [
                {
                  name: "statItem",
                  title: "Stat",
                  type: "object",
                  fields: [
                    defineField({
                      name: "value",
                      title: "Value",
                      type: "string",
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "label",
                      title: "Label",
                      type: "string",
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "caption",
                      title: "Caption",
                      type: "text",
                      rows: 2,
                    }),
                  ],
                  preview: {
                    select: { value: "value", label: "label" },
                    prepare(selection) {
                      return { title: selection.value || "Stat", subtitle: selection.label };
                    },
                  },
                },
              ],
            }),
          ],
          preview: {
            select: { title: "title", items: "items" },
            prepare(selection) {
              const count = Array.isArray(selection.items) ? selection.items.length : 0;
              return {
                title: selection.title || "Stat grid",
                subtitle: `${count} stat${count === 1 ? "" : "s"}`,
              };
            },
          },
        },
        {
          name: "comparisonTable",
          title: "Comparison table",
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
            }),
            defineField({
              name: "columns",
              title: "Columns",
              type: "array",
              of: [{ type: "string" }],
              validation: (Rule) => Rule.required().min(2).max(5),
            }),
            defineField({
              name: "rows",
              title: "Rows",
              type: "array",
              validation: (Rule) => Rule.required().min(1),
              of: [
                {
                  name: "comparisonRow",
                  title: "Comparison row",
                  type: "object",
                  fields: [
                    defineField({
                      name: "label",
                      title: "Label",
                      type: "string",
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "cells",
                      title: "Cells",
                      type: "array",
                      of: [{ type: "string" }],
                      validation: (Rule) => Rule.required().min(1),
                    }),
                  ],
                  preview: {
                    select: { label: "label" },
                    prepare(selection) {
                      return { title: selection.label || "Row" };
                    },
                  },
                },
              ],
            }),
          ],
          preview: {
            select: { title: "title", rows: "rows" },
            prepare(selection) {
              const count = Array.isArray(selection.rows) ? selection.rows.length : 0;
              return {
                title: selection.title || "Comparison table",
                subtitle: `${count} row${count === 1 ? "" : "s"}`,
              };
            },
          },
        },
        {
          name: "sourceCard",
          title: "Source card",
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "publisher",
              title: "Publisher",
              type: "string",
            }),
            defineField({
              name: "author",
              title: "Author",
              type: "string",
            }),
            defineField({
              name: "url",
              title: "URL",
              type: "url",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "summary",
              title: "Summary",
              type: "text",
              rows: 3,
            }),
            defineField({
              name: "accessedAt",
              title: "Accessed at",
              type: "date",
            }),
          ],
          preview: {
            select: { title: "title", publisher: "publisher", url: "url" },
            prepare(selection) {
              return {
                title: selection.title || "Source",
                subtitle: selection.publisher || selection.url,
              };
            },
          },
        },
        {
          name: "imageSet",
          title: "Image set",
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
            }),
            defineField({
              name: "variant",
              title: "Layout",
              type: "string",
              initialValue: "grid",
              options: {
                list: [
                  { title: "Grid", value: "grid" },
                  { title: "Comparison", value: "comparison" },
                  { title: "Sequence", value: "sequence" },
                ],
              },
            }),
            defineField({
              name: "images",
              title: "Images",
              type: "array",
              validation: (Rule) => Rule.required().min(1).max(6),
              of: [
                {
                  type: "image",
                  options: { hotspot: true },
                  fields: [
                    defineField({
                      name: "role",
                      title: "Role",
                      type: "string",
                      options: {
                        list: [
                          { title: "Cover", value: "cover" },
                          { title: "Inline", value: "inline" },
                          { title: "Social", value: "social" },
                          { title: "Reference", value: "reference" },
                        ],
                      },
                    }),
                    defineField({
                      name: "alt",
                      title: "Alt text",
                      type: "string",
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "caption",
                      title: "Caption",
                      type: "text",
                      rows: 2,
                    }),
                  ],
                },
              ],
            }),
          ],
          preview: {
            select: { title: "title", images: "images" },
            prepare(selection) {
              const count = Array.isArray(selection.images) ? selection.images.length : 0;
              return {
                title: selection.title || "Image set",
                subtitle: `${count} image${count === 1 ? "" : "s"}`,
              };
            },
          },
        },
        {
          name: "embedBlock",
          title: "Safe embed",
          type: "object",
          fields: [
            defineField({
              name: "provider",
              title: "Provider",
              type: "string",
              options: {
                list: [
                  { title: "YouTube", value: "youtube" },
                  { title: "X / Twitter", value: "x" },
                  { title: "GitHub", value: "github" },
                  { title: "Website", value: "website" },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "url",
              title: "URL",
              type: "url",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "caption",
              title: "Caption",
              type: "text",
              rows: 2,
            }),
          ],
          preview: {
            select: { title: "title", provider: "provider", url: "url" },
            prepare(selection) {
              return {
                title: selection.title || "Embed",
                subtitle: selection.provider || selection.url,
              };
            },
          },
        },
        {
          name: "diagramBlock",
          title: "Diagram",
          type: "object",
          fields: [
            defineField({
              name: "diagramType",
              title: "Diagram type",
              type: "string",
              initialValue: "mermaid",
              options: {
                list: [
                  { title: "Mermaid", value: "mermaid" },
                  { title: "Image", value: "image" },
                  { title: "Concept", value: "concept" },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "title",
              title: "Title",
              type: "string",
            }),
            defineField({
              name: "mermaidCode",
              title: "Mermaid code",
              type: "text",
              rows: 12,
              hidden: ({ parent }) => parent?.diagramType !== "mermaid",
            }),
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
              hidden: ({ parent }) => parent?.diagramType !== "image",
              fields: [
                defineField({
                  name: "alt",
                  title: "Alt text",
                  type: "string",
                }),
              ],
            }),
            defineField({
              name: "caption",
              title: "Caption",
              type: "text",
              rows: 2,
            }),
          ],
          preview: {
            select: { title: "title", diagramType: "diagramType" },
            prepare(selection) {
              return { title: selection.title || "Diagram", subtitle: selection.diagramType };
            },
          },
        },
        {
          name: "componentBlock",
          title: "Whitelisted component",
          type: "object",
          fields: [
            defineField({
              name: "componentKey",
              title: "Component",
              type: "string",
              options: {
                list: [
                  { title: "Frontier note", value: "frontierNote" },
                  { title: "Outcome ladder", value: "outcomeLadder" },
                  { title: "Article divider", value: "articleDivider" },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "props",
              title: "Props",
              type: "array",
              description: "String key/value props only. Do not store JSX, HTML, or script.",
              of: [
                {
                  name: "componentProp",
                  title: "Prop",
                  type: "object",
                  fields: [
                    defineField({
                      name: "name",
                      title: "Name",
                      type: "string",
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: "value",
                      title: "Value",
                      type: "text",
                      rows: 2,
                    }),
                  ],
                },
              ],
            }),
          ],
          preview: {
            select: { componentKey: "componentKey" },
            prepare(selection) {
              return { title: selection.componentKey || "Component block" };
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
                    defineField({
                      name: "richCells",
                      title: "Rich cells",
                      type: "array",
                      description:
                        "Generated Portable Text cell content. Keep cells as plain-text fallback.",
                      of: [
                        {
                          name: "tableCell",
                          title: "Table cell",
                          type: "object",
                          fields: [
                            defineField({
                              name: "content",
                              title: "Content",
                              type: "array",
                              of: [
                                {
                                  type: "block",
                                  styles: [{ title: "Normal", value: "normal" }],
                                  lists: [],
                                  marks: {
                                    annotations: [
                                      {
                                        name: "link",
                                        title: "Link",
                                        type: "object",
                                        fields: [
                                          defineField({
                                            name: "href",
                                            title: "URL or anchor",
                                            type: "string",
                                            validation: (Rule) => Rule.required(),
                                          }),
                                        ],
                                      },
                                      {
                                        name: "citation",
                                        title: "Citation",
                                        type: "object",
                                        fields: [
                                          defineField({
                                            name: "refNumber",
                                            title: "Reference number",
                                            type: "number",
                                            validation: (Rule) =>
                                              Rule.required().integer().positive(),
                                          }),
                                          defineField({
                                            name: "href",
                                            title: "Reference anchor",
                                            type: "string",
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
                              ],
                            }),
                          ],
                        },
                      ],
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
