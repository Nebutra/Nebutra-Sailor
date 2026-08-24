import { defineArrayMember, defineField } from "sanity";

/**
 * Editorial body blocks for `post`.
 *
 * These live beside `post.ts` rather than inside it because the body array is
 * the part of the content model that keeps growing: every new block is ~60
 * lines of field definitions, and inlining them all buries the document's own
 * fields under its vocabulary.
 *
 * Members are wrapped in `defineArrayMember` because they are declared here and
 * spread into `post.ts` later. An array literal declared away from its target
 * loses contextual typing, and TypeScript then unions every member's
 * `preview.select` into a shape where each key is `string | undefined` — which
 * no longer satisfies Sanity's `Record<string, string>`.
 *
 * Two conventions hold across every block:
 *
 * - Any reader-visible label is an author-supplied field, not a renderer
 *   constant. Posts are one document per language, so the author writes the
 *   eyebrow in the language of the document. A default baked into the renderer
 *   is how "Dimension" ended up sitting on top of Chinese articles.
 * - Blocks are additive. Renaming a `name` orphans published content, so
 *   prefer adding a field over reshaping one.
 */

const labelField = defineField({
  name: "label",
  title: "Eyebrow label",
  description: "Small uppercase label above the block. Write it in the document's language.",
  type: "string",
});

const titleField = defineField({
  name: "title",
  title: "Title",
  type: "string",
});

function countSubtitle(value: unknown, singular: string, plural: string): string {
  const count = Array.isArray(value) ? value.length : 0;
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Inline objects available inside a body paragraph. */
export const POST_INLINE_OBJECTS = [
  defineArrayMember({
    name: "entityChip",
    title: "Entity chip",
    type: "object",
    fields: [
      defineField({
        name: "name",
        title: "Name",
        type: "string",
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: "href",
        title: "URL",
        type: "url",
      }),
      defineField({
        name: "logo",
        title: "Logo",
        type: "image",
        options: { hotspot: false },
      }),
    ],
    preview: {
      select: { name: "name", href: "href" },
      prepare(selection) {
        return { title: selection.name || "Entity", subtitle: selection.href };
      },
    },
  }),
];

/** Block-level objects available in the post body array. */
export const POST_EDITORIAL_BLOCKS = [
  defineArrayMember({
    name: "keyTakeaways",
    title: "Key takeaways",
    type: "object",
    fields: [
      labelField,
      titleField,
      defineField({
        name: "items",
        title: "Takeaways",
        type: "array",
        validation: (Rule) => Rule.required().min(2).max(6),
        of: [
          defineArrayMember({
            name: "takeaway",
            title: "Takeaway",
            type: "object",
            fields: [
              defineField({
                name: "text",
                title: "Text",
                type: "text",
                rows: 2,
                validation: (Rule) => Rule.required(),
              }),
            ],
            preview: {
              select: { text: "text" },
              prepare(selection) {
                return { title: selection.text?.slice(0, 80) || "Takeaway" };
              },
            },
          }),
        ],
      }),
    ],
    preview: {
      select: { title: "title", items: "items" },
      prepare(selection) {
        return {
          title: selection.title || "Key takeaways",
          subtitle: countSubtitle(selection.items, "takeaway", "takeaways"),
        };
      },
    },
  }),
  defineArrayMember({
    name: "timelineBlock",
    title: "Timeline",
    type: "object",
    fields: [
      labelField,
      titleField,
      defineField({
        name: "items",
        title: "Entries",
        type: "array",
        validation: (Rule) => Rule.required().min(2),
        of: [
          defineArrayMember({
            name: "timelineItem",
            title: "Entry",
            type: "object",
            fields: [
              defineField({
                name: "marker",
                title: "Marker",
                description: "Short: a year, a quarter, a version. Rendered in tabular figures.",
                type: "string",
                validation: (Rule) => Rule.required(),
              }),
              defineField({
                name: "title",
                title: "Title",
                type: "string",
                validation: (Rule) => Rule.required(),
              }),
              defineField({ name: "body", title: "Body", type: "text", rows: 2 }),
            ],
            preview: {
              select: { marker: "marker", title: "title" },
              prepare(selection) {
                return { title: selection.title || "Entry", subtitle: selection.marker };
              },
            },
          }),
        ],
      }),
    ],
    preview: {
      select: { title: "title", items: "items" },
      prepare(selection) {
        return {
          title: selection.title || "Timeline",
          subtitle: countSubtitle(selection.items, "entry", "entries"),
        };
      },
    },
  }),
  defineArrayMember({
    name: "chartBlock",
    title: "Chart",
    type: "object",
    fields: [
      labelField,
      titleField,
      defineField({
        name: "variant",
        title: "Variant",
        type: "string",
        initialValue: "bar",
        options: {
          list: [
            { title: "Bars", value: "bar" },
            { title: "Trend line", value: "line" },
          ],
        },
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: "points",
        title: "Points",
        type: "array",
        validation: (Rule) => Rule.required().min(1).max(12),
        of: [
          defineArrayMember({
            name: "chartPoint",
            title: "Point",
            type: "object",
            fields: [
              defineField({
                name: "label",
                title: "Label",
                type: "string",
                validation: (Rule) => Rule.required(),
              }),
              defineField({
                name: "value",
                title: "Value",
                description: "Numeric magnitude used for the bar or line geometry.",
                type: "number",
                validation: (Rule) => Rule.required(),
              }),
              defineField({
                name: "display",
                title: "Display value",
                description: 'Formatted string shown to readers, e.g. "$2B" or "92%".',
                type: "string",
              }),
            ],
            preview: {
              select: { label: "label", display: "display", value: "value" },
              prepare(selection) {
                return {
                  title: selection.label || "Point",
                  subtitle: selection.display ?? String(selection.value ?? ""),
                };
              },
            },
          }),
        ],
      }),
      defineField({ name: "caption", title: "Caption", type: "text", rows: 2 }),
    ],
    preview: {
      select: { title: "title", variant: "variant", points: "points" },
      prepare(selection) {
        return {
          title: selection.title || "Chart",
          subtitle: `${selection.variant ?? "bar"} · ${countSubtitle(selection.points, "point", "points")}`,
        };
      },
    },
  }),
  defineArrayMember({
    name: "stepLadder",
    title: "Step ladder",
    type: "object",
    fields: [
      labelField,
      titleField,
      defineField({
        name: "steps",
        title: "Steps",
        type: "array",
        validation: (Rule) => Rule.required().min(2),
        of: [
          defineArrayMember({
            name: "step",
            title: "Step",
            type: "object",
            fields: [
              defineField({
                name: "title",
                title: "Title",
                type: "string",
                validation: (Rule) => Rule.required(),
              }),
              defineField({ name: "body", title: "Body", type: "text", rows: 2 }),
            ],
            preview: {
              select: { title: "title" },
              prepare(selection) {
                return { title: selection.title || "Step" };
              },
            },
          }),
        ],
      }),
    ],
    preview: {
      select: { title: "title", steps: "steps" },
      prepare(selection) {
        return {
          title: selection.title || "Step ladder",
          subtitle: countSubtitle(selection.steps, "step", "steps"),
        };
      },
    },
  }),
  defineArrayMember({
    name: "faqBlock",
    title: "FAQ",
    type: "object",
    fields: [
      labelField,
      titleField,
      defineField({
        name: "defaultOpenFirst",
        title: "Open the first entry",
        type: "boolean",
        initialValue: false,
      }),
      defineField({
        name: "items",
        title: "Questions",
        type: "array",
        validation: (Rule) => Rule.required().min(1),
        of: [
          defineArrayMember({
            name: "faqItem",
            title: "Question",
            type: "object",
            fields: [
              defineField({
                name: "question",
                title: "Question",
                type: "string",
                validation: (Rule) => Rule.required(),
              }),
              defineField({
                name: "answer",
                title: "Answer",
                type: "text",
                rows: 4,
                validation: (Rule) => Rule.required(),
              }),
            ],
            preview: {
              select: { question: "question" },
              prepare(selection) {
                return { title: selection.question || "Question" };
              },
            },
          }),
        ],
      }),
    ],
    preview: {
      select: { title: "title", items: "items" },
      prepare(selection) {
        return {
          title: selection.title || "FAQ",
          subtitle: countSubtitle(selection.items, "question", "questions"),
        };
      },
    },
  }),
  defineArrayMember({
    name: "marginNote",
    title: "Margin note",
    type: "object",
    fields: [
      labelField,
      titleField,
      defineField({
        name: "body",
        title: "Body",
        description: "Keep it short — this renders in a 12rem margin column on wide screens.",
        type: "text",
        rows: 3,
        validation: (Rule) => Rule.required().max(240),
      }),
    ],
    preview: {
      select: { title: "title", body: "body" },
      prepare(selection) {
        return {
          title: selection.title || "Margin note",
          subtitle: selection.body?.slice(0, 80) ?? "",
        };
      },
    },
  }),
  defineArrayMember({
    name: "authorBio",
    title: "Author bio",
    type: "object",
    fields: [
      labelField,
      defineField({
        name: "name",
        title: "Name",
        type: "string",
        validation: (Rule) => Rule.required(),
      }),
      defineField({ name: "role", title: "Role", type: "string" }),
      defineField({ name: "bio", title: "Bio", type: "text", rows: 3 }),
      defineField({
        name: "avatar",
        title: "Avatar",
        type: "image",
        options: { hotspot: true },
      }),
      defineField({
        name: "links",
        title: "Links",
        type: "array",
        of: [
          defineArrayMember({
            name: "authorLink",
            title: "Link",
            type: "object",
            fields: [
              defineField({
                name: "label",
                title: "Label",
                type: "string",
                validation: (Rule) => Rule.required(),
              }),
              defineField({
                name: "href",
                title: "URL",
                type: "url",
                validation: (Rule) => Rule.required(),
              }),
            ],
            preview: {
              select: { label: "label", href: "href" },
              prepare(selection) {
                return { title: selection.label || "Link", subtitle: selection.href };
              },
            },
          }),
        ],
      }),
    ],
    preview: {
      select: { name: "name", role: "role" },
      prepare(selection) {
        return { title: selection.name || "Author", subtitle: selection.role };
      },
    },
  }),
];
