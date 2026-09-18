import { isOrganizationsUnavailableError } from "@nebutra/auth";
import { describe, expect, it } from "vitest";
import { classifyOrganizationCreateError, ORGANIZATION_ERROR_CODES } from "../organization-errors";

/**
 * Onboarding reported "workspace creation failed" for every cause, because the
 * API caught everything into one 500 with no code. These are the causes it has
 * to be able to tell apart — and the ones it must refuse to guess at.
 */
describe("classifyOrganizationCreateError", () => {
  it("recognises a deployment with no organization support", () => {
    const error = Object.assign(new Error("organization plugin is not enabled"), {
      code: "ORGANIZATIONS_UNAVAILABLE",
    });

    expect(classifyOrganizationCreateError(error, isOrganizationsUnavailableError)).toBe(
      ORGANIZATION_ERROR_CODES.notEnabled,
    );
  });

  it("recognises a slug collision from Better Auth", () => {
    const error = Object.assign(new Error("Organization slug is already taken"), {
      body: { message: "slug already exists" },
    });

    expect(classifyOrganizationCreateError(error, isOrganizationsUnavailableError)).toBe(
      ORGANIZATION_ERROR_CODES.slugTaken,
    );
  });

  it("recognises a slug collision from Clerk", () => {
    const error = Object.assign(new Error("Unprocessable Entity"), {
      body: { errors: [{ code: "form_identifier_exists", meta: { param_name: "slug" } }] },
    });

    expect(classifyOrganizationCreateError(error, isOrganizationsUnavailableError)).toBe(
      ORGANIZATION_ERROR_CODES.slugTaken,
    );
  });

  it("recognises a Prisma unique violation on the slug", () => {
    const error = Object.assign(new Error("Unique constraint failed on the fields: (`slug`)"), {
      code: "P2002",
    });

    expect(classifyOrganizationCreateError(error, isOrganizationsUnavailableError)).toBe(
      ORGANIZATION_ERROR_CODES.slugTaken,
    );
  });

  it("returns null rather than guessing when the cause is unknown", () => {
    // The generic 500 is the honest answer here. Inventing a code would send
    // the user to edit a field that is not the problem.
    expect(
      classifyOrganizationCreateError(new Error("ECONNREFUSED"), isOrganizationsUnavailableError),
    ).toBeNull();
    expect(classifyOrganizationCreateError(null, isOrganizationsUnavailableError)).toBeNull();
  });

  it("does not call a conflict a slug conflict when the slug is not involved", () => {
    // "already exists" on its own is not enough — a duplicate member or invite
    // must not be reported as a bad workspace address.
    expect(
      classifyOrganizationCreateError(
        new Error("member already exists"),
        isOrganizationsUnavailableError,
      ),
    ).toBeNull();
  });
});
