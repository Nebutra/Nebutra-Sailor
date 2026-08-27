import { defineField, defineType } from "sanity";

export const blogComment = defineType({
  name: "blogComment",
  title: "Blog comment",
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
      name: "body",
      title: "Body",
      type: "text",
      rows: 5,
      validation: (Rule) => Rule.required().min(2).max(1200),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      initialValue: "pending",
      options: {
        layout: "radio",
        list: [
          { title: "Pending review", value: "pending" },
          { title: "Approved", value: "approved" },
          { title: "Hidden", value: "hidden" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "authorId",
      title: "Author ID",
      type: "string",
      readOnly: true,
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
      title: "body",
      authorName: "authorName",
      status: "status",
      language: "language",
      createdAt: "createdAt",
    },
    prepare(selection) {
      const { authorName, createdAt, language, status, title } = selection;
      const date = createdAt ? new Date(createdAt).toLocaleDateString() : null;
      return {
        title: typeof title === "string" ? title.slice(0, 80) : "Blog comment",
        subtitle: [status, language?.toUpperCase(), authorName, date].filter(Boolean).join(" · "),
      };
    },
  },
});
