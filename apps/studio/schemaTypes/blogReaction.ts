import { defineField, defineType } from "sanity";

export const blogReaction = defineType({
  name: "blogReaction",
  title: "Blog reaction",
  type: "document",
  fields: [
    defineField({
      name: "translationKey",
      title: "Translation key",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "postSlug",
      title: "Post slug",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "language",
      title: "Language",
      type: "string",
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
      name: "kind",
      title: "Kind",
      type: "string",
      initialValue: "like",
      options: {
        layout: "radio",
        list: [
          { title: "Like", value: "like" },
          { title: "Save", value: "save" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "authorId",
      title: "Author ID",
      type: "string",
      readOnly: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "authorName",
      title: "Author name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "authorEmail",
      title: "Author email",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "authorImageUrl",
      title: "Author image URL",
      type: "url",
      readOnly: true,
    }),
    defineField({
      name: "createdAt",
      title: "Created at",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      authorName: "authorName",
      createdAt: "createdAt",
      kind: "kind",
      language: "language",
      postSlug: "postSlug",
    },
    prepare(selection) {
      const { authorName, createdAt, kind, language, postSlug } = selection;
      const date = createdAt ? new Date(createdAt).toLocaleDateString() : null;
      return {
        title: [kind, postSlug].filter(Boolean).join(" · ") || "Blog reaction",
        subtitle: [language?.toUpperCase(), authorName, date].filter(Boolean).join(" · "),
      };
    },
  },
});
