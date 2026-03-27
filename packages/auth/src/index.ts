// @nebutra/auth — public API

// Middleware factory
export { createAuthMiddleware } from "./middleware.js";

// Server factory
export { createAuth } from "./server.js";
// Canonical types
export type {
  AuthConfig,
  AuthProvider,
  AuthProviderId,
  CreateOrgInput,
  CreateUserInput,
  Organization,
  Session,
  SignInMethod,
  User,
} from "./types.js";
