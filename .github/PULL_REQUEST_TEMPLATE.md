## Summary

<!-- 2-4 bullets covering WHAT changed and WHY -->

-
-

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / internal improvement
- [ ] Performance improvement
- [ ] Breaking change (requires migration)
- [ ] Infrastructure / CI/CD
- [ ] Documentation

## How was this tested?

<!-- Which test types cover this change? Link to test files if relevant. -->

- [ ] Unit tests (vitest / pytest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Manual testing — describe:

## Checklist

### Code quality
- [ ] Self-reviewed (no debug code, no TODO without ticket)
- [ ] No `console.log` in production paths (use `@nebutra/logger`)
- [ ] No hardcoded secrets or API keys
- [ ] Follows immutable-data patterns (no mutation)

### Security
- [ ] User input is validated at boundaries (Zod / Pydantic)
- [ ] No SQL injection surface (parameterized queries only)
- [ ] Auth / authz checks added where needed
- [ ] Rate limiting considered for new public endpoints

### Observability
- [ ] New errors propagated to Sentry / logger
- [ ] New backend routes emit logs with `requestId`
- [ ] Metrics emitted for new critical paths (if applicable)

### Database
- [ ] Prisma schema changes include migration file
- [ ] Migration is backwards-compatible with the previous deploy
- [ ] Indexes added for new query patterns

### Infrastructure (if infra changed)
- [ ] K8s manifests validated (`kubectl apply --dry-run=server`)
- [ ] Resource `requests`/`limits` set on new containers
- [ ] New secrets added to ExternalSecrets template

### Breaking changes
- [ ] API versioning strategy respected
- [ ] Consumers of changed interfaces notified
- [ ] Feature flag added for risky rollouts

## Screenshots / recordings (UI changes only)

<!-- Paste screenshots or Loom link here -->

## Related issues / tickets

<!-- Closes #123 -->
