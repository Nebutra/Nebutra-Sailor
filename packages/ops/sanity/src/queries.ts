import { client } from "./client";

// ============================================
// Posts
// ============================================

export const postsQuery = `*[
  _type == "post" &&
  !(_id in path("drafts.**")) &&
  defined(slug.current) &&
  language == $language &&
  defined(publishedAt) &&
  publishedAt <= now()
] | order(publishedAt desc) {
  _id,
  _updatedAt,
  title,
  slug,
  language,
  translationKey,
  publishedAt,
  excerpt,
  mainImage,
  "author": author->name,
  "categories": categories[]->title
}`;

export const postBySlugQuery = `*[
  _type == "post" &&
  !(_id in path("drafts.**")) &&
  slug.current == $slug &&
  language == $language &&
  defined(publishedAt) &&
  publishedAt <= now()
][0] {
  _id,
  _updatedAt,
  title,
  slug,
  language,
  translationKey,
  publishedAt,
  excerpt,
  body,
  mainImage,
  "author": author->{name, image, bio},
  "categories": categories[]->title
}`;

export const postTranslationByKeyQuery = `*[
  _type == "post" &&
  !(_id in path("drafts.**")) &&
  translationKey == $translationKey &&
  language == $language &&
  defined(slug.current) &&
  defined(publishedAt) &&
  publishedAt <= now()
][0] {
  _id,
  _updatedAt,
  title,
  slug,
  language,
  translationKey,
  publishedAt,
  excerpt,
  mainImage,
  "author": author->name,
  "categories": categories[]->title
}`;

export async function getPosts(language = "en") {
  return client.fetch(postsQuery, { language });
}

export async function getPostBySlug(slug: string, language = "en") {
  return client.fetch(postBySlugQuery, { slug, language });
}

export async function getPostTranslationByKey(translationKey: string, language = "en") {
  return client.fetch(postTranslationByKeyQuery, { translationKey, language });
}

// ============================================
// Pages
// ============================================

export const pageBySlugQuery = `*[_type == "page" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  content,
  seo
}`;

export async function getPageBySlug(slug: string) {
  return client.fetch(pageBySlugQuery, { slug });
}

// ============================================
// Site Settings
// ============================================

export const siteSettingsQuery = `*[_type == "siteSettings"][0] {
  title,
  description,
  logo,
  favicon,
  socialLinks,
  footer
}`;

export async function getSiteSettings() {
  return client.fetch(siteSettingsQuery);
}

// ============================================
// Categories
// ============================================

export const categoriesQuery = `*[_type == "category"] | order(title asc) {
  _id,
  title,
  slug,
  description
}`;

export async function getCategories() {
  return client.fetch(categoriesQuery);
}

// ============================================
// Showcase
// ============================================

export const showcaseQuery = `*[_type == "showcase"] | order(featured desc, publishedAt desc) {
  _id,
  name,
  slug,
  url,
  description,
  logo,
  screenshot,
  category,
  featured,
  publishedAt
}`;

export async function getShowcaseProjects() {
  return client.fetch(showcaseQuery);
}

// ============================================
// Changelog
// ============================================

export const changelogQuery = `*[_type == "changelogEntry"] | order(publishedAt desc) {
  _id,
  version,
  title,
  publishedAt,
  type,
  summary,
  body
}`;

export const changelogByVersionQuery = `*[_type == "changelogEntry" && version == $version][0] {
  _id,
  version,
  title,
  publishedAt,
  type,
  summary,
  body
}`;

export const changelogTypesQuery = `array::unique(*[_type == "changelogEntry"].type)`;

export async function getChangelogEntries() {
  return client.fetch(changelogQuery);
}

export async function getChangelogByVersion(version: string) {
  return client.fetch(changelogByVersionQuery, { version });
}

export async function getChangelogTypes() {
  return client.fetch(changelogTypesQuery);
}
