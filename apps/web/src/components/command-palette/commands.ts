import {
  Bell,
  CreditCard,
  FileText,
  Home,
  KeyRound,
  LogOut,
  Moon,
  Plus,
  Settings,
  Shield,
  Sun,
  UserPlus,
  Users,
  Webhook,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { Scope } from "@/lib/permissions";

export type CommandSection = "navigation" | "actions" | "settings" | "account" | "admin";

/**
 * Single command-palette entry. Handlers receive the host context
 * (router + theme setter) so they can be defined statically without
 * closures over React state.
 */
export interface CommandContext {
  /** Navigate to an in-app path. */
  navigate: (href: string) => void;
  /** Apply a theme choice ("light" | "dark" | "system"). */
  setTheme: (choice: "light" | "dark" | "system") => void;
  /** Sign the current user out. */
  signOut: () => void;
  /** Trigger the organization switcher modal. */
  switchOrganization: () => void;
}

export interface CommandDefinition {
  id: string;
  /** Translation key under `commandPalette.commands.<id>`. */
  titleKey: string;
  section: CommandSection;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Optional shortcut hint, e.g. ["⌘", "S"]. */
  shortcut?: string[];
  /** Tags improve search recall (case-insensitive). */
  tags?: string[];
  /** Required permission scope to surface this command. */
  requires?: Scope;
  /** Imperative handler invoked when the user picks the command. */
  handler: (ctx: CommandContext) => void;
}

/**
 * Static command registry. Keep handlers pure — all side-effects
 * flow through CommandContext so the registry is unit-testable.
 */
export const COMMANDS: ReadonlyArray<CommandDefinition> = [
  // ── Navigation ────────────────────────────────────────────────────────
  {
    id: "nav.home",
    titleKey: "nav.home",
    section: "navigation",
    icon: Home,
    tags: ["dashboard", "start"],
    handler: ({ navigate }) => navigate("/"),
  },
  {
    id: "nav.settings",
    titleKey: "nav.settings",
    section: "navigation",
    icon: Settings,
    tags: ["preferences", "profile"],
    requires: "settings:read",
    handler: ({ navigate }) => navigate("/settings"),
  },
  {
    id: "nav.billing",
    titleKey: "nav.billing",
    section: "navigation",
    icon: CreditCard,
    tags: ["plan", "subscription", "invoice"],
    requires: "billing:read",
    handler: ({ navigate }) => navigate("/billing"),
  },
  {
    id: "nav.team",
    titleKey: "nav.team",
    section: "navigation",
    icon: Users,
    tags: ["members", "organization"],
    requires: "team:read",
    handler: ({ navigate }) => navigate("/settings/team"),
  },
  {
    id: "nav.apiKeys",
    titleKey: "nav.apiKeys",
    section: "navigation",
    icon: KeyRound,
    tags: ["api", "tokens", "credentials"],
    requires: "api_key:read",
    handler: ({ navigate }) => navigate("/settings/api-keys"),
  },
  {
    id: "nav.notifications",
    titleKey: "nav.notifications",
    section: "navigation",
    icon: Bell,
    tags: ["alerts", "inbox"],
    handler: ({ navigate }) => navigate("/settings/notifications"),
  },
  {
    id: "nav.auditLog",
    titleKey: "nav.auditLog",
    section: "navigation",
    icon: FileText,
    tags: ["history", "activity", "logs"],
    requires: "audit_log:read",
    handler: ({ navigate }) => navigate("/audit"),
  },
  {
    id: "nav.webhooks",
    titleKey: "nav.webhooks",
    section: "navigation",
    icon: Webhook,
    tags: ["integrations", "events"],
    requires: "settings:update",
    handler: ({ navigate }) => navigate("/settings/webhooks"),
  },
  {
    id: "nav.admin",
    titleKey: "nav.admin",
    section: "admin",
    icon: Shield,
    tags: ["super", "system"],
    requires: "admin:access",
    handler: ({ navigate }) => navigate("/admin"),
  },
  // ── Actions ───────────────────────────────────────────────────────────
  {
    id: "action.inviteMember",
    titleKey: "action.inviteMember",
    section: "actions",
    icon: UserPlus,
    tags: ["team", "add", "invite"],
    requires: "team:invite",
    handler: ({ navigate }) => navigate("/settings/team?invite=1"),
  },
  {
    id: "action.createApiKey",
    titleKey: "action.createApiKey",
    section: "actions",
    icon: Plus,
    tags: ["api", "token", "new"],
    requires: "api_key:create",
    handler: ({ navigate }) => navigate("/settings/api-keys?new=1"),
  },
  {
    id: "action.switchOrganization",
    titleKey: "action.switchOrganization",
    section: "account",
    icon: Users,
    tags: ["workspace", "tenant"],
    handler: ({ switchOrganization }) => switchOrganization(),
  },
  // ── Settings (theme) ──────────────────────────────────────────────────
  {
    id: "settings.themeLight",
    titleKey: "settings.themeLight",
    section: "settings",
    icon: Sun,
    tags: ["theme", "appearance", "light"],
    handler: ({ setTheme }) => setTheme("light"),
  },
  {
    id: "settings.themeDark",
    titleKey: "settings.themeDark",
    section: "settings",
    icon: Moon,
    tags: ["theme", "appearance", "dark"],
    handler: ({ setTheme }) => setTheme("dark"),
  },
  {
    id: "settings.themeSystem",
    titleKey: "settings.themeSystem",
    section: "settings",
    icon: Settings,
    tags: ["theme", "appearance", "system", "auto"],
    handler: ({ setTheme }) => setTheme("system"),
  },
  // ── Account ───────────────────────────────────────────────────────────
  {
    id: "account.signOut",
    titleKey: "account.signOut",
    section: "account",
    icon: LogOut,
    tags: ["logout", "exit"],
    handler: ({ signOut }) => signOut(),
  },
];

/** Sections in the order they should render. */
export const SECTION_ORDER: ReadonlyArray<CommandSection> = [
  "navigation",
  "actions",
  "settings",
  "account",
  "admin",
];

/**
 * Filter commands by required permission scope.
 * A command without a `requires` field is always visible.
 */
export function filterCommandsByPermission(
  commands: ReadonlyArray<CommandDefinition>,
  can: (scope: Scope) => boolean,
): CommandDefinition[] {
  return commands.filter((cmd) => (cmd.requires ? can(cmd.requires) : true));
}

/** Group commands by section, preserving COMMANDS source order within each section. */
export function groupBySection(
  commands: ReadonlyArray<CommandDefinition>,
): Record<CommandSection, CommandDefinition[]> {
  const groups = SECTION_ORDER.reduce(
    (acc, section) => ({ ...acc, [section]: [] as CommandDefinition[] }),
    {} as Record<CommandSection, CommandDefinition[]>,
  );
  for (const cmd of commands) {
    groups[cmd.section] = [...groups[cmd.section], cmd];
  }
  return groups;
}
