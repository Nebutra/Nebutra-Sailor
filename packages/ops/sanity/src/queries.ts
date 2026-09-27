import { client, isSanityConfigured } from "./client";

/**
 * A read that answers `empty` (no documents) when no Sanity project is
 * configured. Untyped like the `client.fetch` it wraps — each caller already
 * narrows the GROQ result to its own shape.
 */
function read(
  query: string,
  params: Record<string, unknown>,
  empty: [] | null,
  // biome-ignore lint/suspicious/noExplicitAny: same contract as client.fetch's default overload
): Promise<any> {
  return isSanityConfigured ? client.fetch(query, params) : Promise.resolve(empty);
}

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
  "author": author->{name, image, bio},
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
  "author": author->{name, image, bio},
  "categories": categories[]->title
}`;

export async function getPosts(language = "en") {
  return read(postsQuery, { language }, []);
}

export async function getPostBySlug(slug: string, language = "en") {
  return read(postBySlugQuery, { slug, language }, null);
}

export async function getPostTranslationByKey(translationKey: string, language = "en") {
  return read(postTranslationByKeyQuery, { translationKey, language }, null);
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
  return read(pageBySlugQuery, { slug }, null);
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
  return read(siteSettingsQuery, {}, null);
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
  return read(categoriesQuery, {}, []);
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
  return read(showcaseQuery, {}, []);
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
  return read(changelogQuery, {}, []);
}

export async function getChangelogByVersion(version: string) {
  return read(changelogByVersionQuery, { version }, null);
}

export async function getChangelogTypes() {
  return read(changelogTypesQuery, {}, []);
}
