import { z } from "zod";

// ── License Tier & Type ─────────────────────────────────────────────────────

export const LicenseTierSchema = z.enum(["INDIVIDUAL", "OPC", "STARTUP", "ENTERPRISE"]);
export type LicenseTier = z.infer<typeof LicenseTierSchema>;

export const LicenseTypeSchema = z.enum(["FREE", "COMMERCIAL"]);
export type LicenseType = z.infer<typeof LicenseTypeSchema>;

// ── Issue License ───────────────────────────────────────────────────────────

export interface IssueLicenseParams {
  userId: string;
  tier: LicenseTier;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  lookingFor?: string[];
  githubHandle?: string | null;
  projectName?: string | null;
  projectUrl?: string | null;
  acceptedIp?: string | null;
}

export interface IssueLicenseResult {
  id: string;
  licenseKey: string;
  tier: LicenseTier;
  type: LicenseType;
  expiresAt: Date | null;
}

// ── Validate License ────────────────────────────────────────────────────────

export interface ValidateLicenseResult {
  valid: boolean;
  tier?: LicenseTier | undefined;
  type?: LicenseType | undefined;
  error?: string | undefined;
}

// ── License Issued Event (queue payload) ────────────────────────────────────

export interface LicenseIssuedEvent {
  licenseId: string;
  licenseKey: string;
  userId: string;
  tier: LicenseTier;
  type: LicenseType;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  lookingFor: string[];
  githubHandle: string | null;
}
