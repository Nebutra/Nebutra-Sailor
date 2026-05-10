# @nebutra/sanity

Sanity CMS client and schema definitions.

## Installation

```bash
pnpm add @nebutra/sanity
```

## Features

- **Pre-configured Client** — Ready-to-use Sanity client
- **Type-safe Schemas** — TypeScript types for all content types
- **GROQ Helpers** — Common query patterns
- **Image Utilities** — Image URL builder

## Setup

### Environment Variables

```bash
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SANITY_API_TOKEN=your-token  # Optional, for mutations
```

## Usage

### Client

```typescript
import { sanityClient } from "@nebutra/sanity";

// Fetch documents
const posts = await sanityClient.fetch(`*[_type == "post"]`);
```

### GROQ Queries

```typescript
import { queries } from "@nebutra/sanity";

// Pre-built queries
const post = await sanityClient.fetch(queries.postBySlug, {
  slug: "my-post",
});

const featured = await sanityClient.fetch(queries.featuredPosts, {
  limit: 5,
});
```

### Image URLs

```typescript
import { urlFor } from "@nebutra/sanity";

const imageUrl = urlFor(post.image).width(800).height(600).format("webp").url();
```

### Mutations

```typescript
import { sanityClient } from "@nebutra/sanity";

// Create document
await sanityClient.create({
  _type: "post",
  title: "New Post",
  slug: { current: "new-post" },
});

// Patch document
await sanityClient
  .patch("document-id")
  .set({ title: "Updated Title" })
  .commit();
```

## Schemas

| Type       | Description        |
| ---------- | ------------------ |
| `post`     | Blog posts         |
| `page`     | Static pages       |
| `author`   | Author profiles    |
| `category` | Content categories |
| `settings` | Site settings      |

## Type Generation

Generate TypeScript types from your Sanity schema:

```bash
pnpm sanity typegen generate
```

## Related

- [Content service](../../backends/python/content/)
- [Landing page](../../apps/landing-page/)
