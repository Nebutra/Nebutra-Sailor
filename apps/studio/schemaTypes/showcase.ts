import { defineField, defineType } from "sanity";

export const showcase = defineType({
  name: "showcase",
  title: "Showcase",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Project Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "url",
      title: "Project URL",
      type: "url",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "screenshot",
      title: "Screenshot",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "SaaS", value: "saas" },
          { title: "E-Commerce", value: "ecommerce" },
          { title: "AI / ML", value: "ai" },
          { title: "Developer Tools", value: "devtools" },
          { title: "Marketing", value: "marketing" },
          { title: "Other", value: "other" },
        ],
      },
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "category",
      media: "logo",
    },
  },
});
