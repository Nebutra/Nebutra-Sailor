// Test file to verify all exports are accessible
// This file is NOT executed, just checked for compilation

import type { AuthConfig, Organization, Session, User } from "@nebutra/auth";
// Main exports
import { createAuth, createAuthMiddleware } from "@nebutra/auth";
import type { SignInMethod } from "@nebutra/auth/client";
// Client exports
import {
  useAuth,
  useAuthContext,
  useOrganization,
  useSession,
  useUser,
} from "@nebutra/auth/client";
// Component exports
import { PhoneLoginForm, SignInForm, SignUpForm, UserButton } from "@nebutra/auth/components";
// Middleware factory
import { createAuthMiddleware as createMiddleware } from "@nebutra/auth/middleware";
import type { AuthContextValue, AuthProviderProps } from "@nebutra/auth/react";
// React exports
import { AuthProvider, BetterAuthProvider, ClerkProvider } from "@nebutra/auth/react";
