# @nebutra/design-system (DEPRECATED)

> This package has been deprecated and merged into `@nebutra/ui`.

## Migration

All layout components (PageHeader, EmptyState, LoadingState, ErrorState) have been moved to `@nebutra/ui/layout`.

```typescript
// Before (deprecated)
import { PageHeader, EmptyState } from "@nebutra/design-system";

// After
import { PageHeader, EmptyState } from "@nebutra/ui/layout";
```

Do not add new dependencies on this package. It contains only legacy `dist/` artifacts and will be removed in a future release.
