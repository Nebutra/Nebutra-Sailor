import { defineField, defineType } from "sanity";

export const changelogEntry = defineType({
  name: "changelogEntry",
  title: "Changelog Entry",
  type: "document",
  fields: [
    defineField({
      name: "version",
      title: "Version",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "type",
      title: "Release Type",
      type: "string",
      options: {
        list: [
          { title: "Feature", value: "feature" },
          { title: "Improvement", value: "improvement" },
          { title: "Fix", value: "fix" },
          { title: "Breaking Change", value: "breaking" },
          { title: "Security", value: "security" },
          { title: "Platform", value: "platform" },
          { title: "Infrastructure", value: "infrastructure" },
          { title: "Major", value: "major" },
          { title: "Foundation", value: "foundation" },
        ],
      },
      initialValue: "feature",
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        {
          type: "image",
          options: { hotspot: true },
        },
      ],
    }),
  ],
  orderings: [
    {
      title: "Release Date, New",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "version",
    },
    prepare({ title, subtitle }) {
      return { title, subtitle: subtitle ? `v${subtitle}` : "" };
    },
  },
});
