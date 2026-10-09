import * as p from "@clack/prompts";
import type { Command } from "commander";
import { CommandError, runCommand } from "../utils/command-error";
import { ExitCode, type ExitCodeValue } from "../utils/exit-codes";
import {
  createStaffClient,
  parseStaffRole,
  STAFF_ROLES,
  StaffApiError,
  type StaffClient,
  type StaffGrant,
} from "../utils/staff-client";

/**
 * `nebutra admin staff` — who may operate the platform, from a terminal or an
 * agent. A thin client of the gateway's one staff surface; it authenticates with
 * the `nebutra login` session and holds no rules of its own (the gateway
 * enforces owner-only, no self-grant, no last-owner removal and writes the audit
 * entry). Every subcommand takes --json.
 *
 * Mutations ask first. There is deliberately NO implicit yes: the CLI's
 * non-interactive mode (piped, CI, agents) does not confirm on your behalf, so
 * an agent must pass --yes on the command itself, after the person agreed.
 */

export interface AdminDeps {
  client?: StaffClient;
  confirm?: (message: string) => Promise<boolean>;
  isInteractive?: () => boolean;
  out?: (line: string) => void;
}

const EXIT_FOR_STATUS = (status: number): ExitCodeValue =>
  status === 400
    ? ExitCode.INVALID_ARGS
    : status === 401 || status === 403
      ? ExitCode.PERMISSION_DENIED
      : status === 404
        ? ExitCode.NOT_FOUND
        : status === 409
          ? ExitCode.CONFLICT
          : ExitCode.ERROR;

function toCommandError(error: unknown): unknown {
  if (!(error instanceof StaffApiError)) return error;
  return new CommandError({
    code: error.code,
    message: error.message,
    exitCode: EXIT_FOR_STATUS(error.status),
    ...(error.code === "not_logged_in" || error.status === 401
      ? { suggestion: "Run `nebutra login`." }
      : {}),
  });
}

function roleOrThrow(raw: string) {
  const role = parseStaffRole(raw);
  if (!role) {
    throw new CommandError({
      code: "invalid_role",
      message: `Unknown role "${raw}".`,
      exitCode: ExitCode.INVALID_ARGS,
      suggestion: `Use one of: ${STAFF_ROLES.join(", ")} (the platform_ prefix is optional).`,
    });
  }
  return role;
}

function requireNote(note: string | undefined): string {
  const trimmed = note?.trim() ?? "";
  if (trimmed.length < 3) {
    throw new CommandError({
      code: "note_required",
      message: "A note is required: say why (ticket, rotation, handover).",
      exitCode: ExitCode.INVALID_ARGS,
      suggestion: 'Add --note "<reason>".',
    });
  }
  return trimmed;
}

export function formatStaffTable(rows: StaffGrant[]): string {
  if (rows.length === 0) return "No staff grants.";
  const line = (r: StaffGrant) =>
    [
      (r.email ?? r.userId).padEnd(28),
      r.role.padEnd(18),
      (r.active ? "active" : `revoked ${r.revokedAt?.slice(0, 10)}`).padEnd(22),
      `by ${r.grantedBy?.email ?? r.grantedBy?.userId ?? "bootstrap"}`.padEnd(28),
      r.note ?? "",
    ].join("  ");
  return rows.map(line).join("\n");
}

async function confirmed(
  deps: Required<Pick<AdminDeps, "confirm" | "isInteractive">>,
  yes: boolean | undefined,
  message: string,
): Promise<void> {
  if (yes === true) return;
  if (!deps.isInteractive()) {
    throw new CommandError({
      code: "confirmation_required",
      message: "This changes who can operate the platform and needs confirmation.",
      exitCode: ExitCode.INVALID_ARGS,
      suggestion: "Re-run with --yes once the person has agreed.",
    });
  }
  if (!(await deps.confirm(message))) {
    throw new CommandError({
      code: "cancelled",
      message: "Cancelled. Nothing changed.",
      exitCode: ExitCode.CANCELLED,
    });
  }
}

interface StaffOptions {
  json?: boolean;
  role?: string;
  note?: string;
  yes?: boolean;
}

export function registerAdminCommand(program: Command, deps: AdminDeps = {}): void {
  const out = deps.out ?? ((line: string) => console.log(line));
  const client = () => deps.client ?? createStaffClient();
  const gate = {
    confirm:
      deps.confirm ??
      (async (message: string) => {
        const answer = await p.confirm({ message });
        return answer === true;
      }),
    isInteractive:
      deps.isInteractive ?? (() => process.stdin.isTTY === true && process.stdout.isTTY === true),
  };
  const emit = (options: StaffOptions, payload: unknown, human: string) =>
    out(options.json ? JSON.stringify(payload, null, 2) : human);

  const admin = program
    .command("admin")
    .description("Platform administration (platform staff only)");
  const staff = admin.command("staff").description("Manage who may operate the platform");

  staff
    .command("list")
    .description("List staff grants, tombstones included")
    .option("--json", "Machine-readable output")
    .action((options: StaffOptions) =>
      runCommand(async () => {
        try {
          const rows = await client().list();
          emit(options, { staff: rows }, formatStaffTable(rows));
        } catch (error) {
          throw toCommandError(error);
        }
      }),
    );

  staff
    .command("whoami")
    .description("Your own platform standing")
    .option("--json", "Machine-readable output")
    .action((options: StaffOptions) =>
      runCommand(async () => {
        try {
          const me = await client().me();
          emit(
            options,
            me,
            `${me.email ?? me.userId}  ${me.role}${me.canGrant ? "  (can grant and revoke)" : ""}`,
          );
        } catch (error) {
          throw toCommandError(error);
        }
      }),
    );

  staff
    .command("grant <email>")
    .description("Grant or change a platform role (platform_owner only)")
    .requiredOption("--role <role>", `One of: ${STAFF_ROLES.join(", ")}`)
    .requiredOption("--note <text>", "Why this person has this role")
    .option("--yes", "Confirm without asking (agents: only after the person agreed)")
    .option("--json", "Machine-readable output")
    .action((email: string, options: StaffOptions) =>
      runCommand(async () => {
        const role = roleOrThrow(options.role ?? "");
        const note = requireNote(options.note);
        await confirmed(gate, options.yes, `Grant ${role} to ${email}?`);
        try {
          const row = await client().grant({ email, role, note });
          emit(
            options,
            row,
            `Granted ${row.role} to ${email}. Audit entry: ${row.auditId ?? "not recorded"}`,
          );
        } catch (error) {
          throw toCommandError(error);
        }
      }),
    );

  staff
    .command("revoke <email>")
    .description("Revoke a grant by tombstone (platform_owner only)")
    .requiredOption("--note <text>", "Why the access ends")
    .option("--yes", "Confirm without asking (agents: only after the person agreed)")
    .option("--json", "Machine-readable output")
    .action((email: string, options: StaffOptions) =>
      runCommand(async () => {
        const note = requireNote(options.note);
        await confirmed(gate, options.yes, `Revoke platform access for ${email}?`);
        try {
          const row = await client().revoke(email, note);
          emit(options, row, `Revoked ${email}. Audit entry: ${row.auditId ?? "not recorded"}`);
        } catch (error) {
          throw toCommandError(error);
        }
      }),
    );
}
