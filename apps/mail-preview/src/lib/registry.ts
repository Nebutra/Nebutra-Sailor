/**
 * Server-only wrapper around the @nebutra/email REACT_EMAIL_TEMPLATES registry.
 *
 * `@nebutra/email` transitively pulls in `nodemailer` (a Node-only optional
 * peer dependency). Importing this module from client components is forbidden
 * — pass `TEMPLATES` down from a Server Component to client components instead.
 *
 * Client-safe types and helpers live in `./template-types.ts`.
 */

import "server-only";
import { REACT_EMAIL_TEMPLATES } from "@nebutra/email";
import { TEMPLATE_FIXTURES } from "./fixtures";
import type { TemplateMeta } from "./template-types";

const CATEGORY_BY_KEY: Record<keyof typeof REACT_EMAIL_TEMPLATES, string> = {
  welcome: "Onboarding",
  passwordReset: "Auth",
  invitation: "Workspace",
  receipt: "Billing",
};

export const TEMPLATES: readonly TemplateMeta[] = (
  Object.entries(REACT_EMAIL_TEMPLATES) as Array<
    [
      keyof typeof REACT_EMAIL_TEMPLATES,
      (typeof REACT_EMAIL_TEMPLATES)[keyof typeof REACT_EMAIL_TEMPLATES],
    ]
  >
).map(([key, value]) => ({
  id: value.id,
  key,
  label: value.label,
  description: value.description,
  fileName: value.fileName,
  defaultProps: TEMPLATE_FIXTURES[key],
  category: CATEGORY_BY_KEY[key],
}));
