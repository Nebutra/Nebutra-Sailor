# @nebutra/repositories

> Data access layer implementing the repository pattern over Prisma for core domain entities.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/repositories@workspace:*
```

## Usage

```typescript
import { UserRepository, OrganizationRepository } from "@nebutra/repositories";
import { prisma } from "@nebutra/db";

const userRepo = new UserRepository(prisma);

// CRUD operations
const user = await userRepo.findById("user_123");
const allUsers = await userRepo.findAll();
```

## API

### Repositories

| Repository | Description |
|------------|-------------|
| `UserRepository` | User CRUD with Clerk ID upsert support |
| `OrganizationRepository` | Organization management |
| `OrganizationMemberRepository` | Organization membership management |
| `WebhookEventRepository` | Webhook event storage and deduplication |

### Types

| Type | Description |
|------|-------------|
| `CreateUserData` | Input for user creation (clerkId, email, name, avatarUrl) |
| `UpdateUserData` | Input for user updates |
| `UpsertByClerkIdData` | Input for upsert by Clerk ID |
| `CreateOrganizationData` | Input for organization creation |
| `UpdateOrganizationData` | Input for organization updates |
| `UpsertMemberData` | Input for membership upsert |
| `UpsertWebhookEventData` | Input for webhook event upsert |
| `CursorPaginationParams` | Cursor-based pagination input |
| `CursorPaginationResult<T>` | Cursor-based pagination result |

## Dependencies

- `@nebutra/db` -- Prisma client and generated types
