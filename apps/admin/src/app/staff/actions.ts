"use server";

import { revalidatePath } from "next/cache";
import { requirePlatform } from "@/lib/staff";
import { grantStaffRole, revokeStaffGrant } from "@/lib/staff-api";

export type StaffActionResult =
  | { ok: true; message: string; auditId: string | null }
  | { ok: false; code: string; message: string };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/**
 * Both actions re-check the ladder here so a read-only tier never produces a
 * gateway call, then let the gateway decide: it is the authority and applies
 * the guards (self-grant, last owner) and writes the audit entry.
 */
export async function grantStaffAction(form: FormData): Promise<StaffActionResult> {
  const staff = await requirePlatform("grant", "PlatformStaff");
  const email = text(form, "email");
  const role = text(form, "role");
  const note = text(form, "note");
  if (!email || !role || note.length < 3) {
    return { ok: false, code: "invalid_input", message: "Email, role and a note are required." };
  }
  const result = await grantStaffRole(staff, { email, role, note });
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  revalidatePath("/staff");
  return {
    ok: true,
    message: `Granted ${result.data.role} to ${email}.`,
    auditId: result.data.auditId ?? null,
  };
}

export async function revokeStaffAction(form: FormData): Promise<StaffActionResult> {
  const staff = await requirePlatform("revoke", "PlatformStaff");
  const userId = text(form, "userId");
  const note = text(form, "note");
  if (!userId || note.length < 3) {
    return { ok: false, code: "invalid_input", message: "A note is required." };
  }
  const result = await revokeStaffGrant(staff, userId, note);
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  revalidatePath("/staff");
  return { ok: true, message: "Access revoked.", auditId: result.data.auditId ?? null };
}
