import { describe, expect, it, vi } from "vitest";
import type { Scope } from "@/lib/permissions";
import {
  COMMANDS,
  type CommandContext,
  filterCommandsByPermission,
  groupBySection,
  SECTION_ORDER,
} from "../commands";

function makeContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    navigate: vi.fn(),
    setTheme: vi.fn(),
    signOut: vi.fn(),
    switchOrganization: vi.fn(),
    openFeedback: vi.fn(),
    ...overrides,
  };
}

describe("commands registry", () => {
  it("contains all six sections", () => {
    const sections = new Set(COMMANDS.map((c) => c.section));
    for (const section of SECTION_ORDER) {
      expect(sections.has(section)).toBe(true);
    }
  });

  it("each command has a unique id", () => {
    const ids = COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("admin nav requires admin:access scope", () => {
    const admin = COMMANDS.find((c) => c.id === "nav.admin");
    expect(admin?.requires).toBe("admin:access");
  });

  it("home command navigates to '/'", () => {
    const home = COMMANDS.find((c) => c.id === "nav.home");
    expect(home).toBeDefined();
    const ctx = makeContext();
    home?.handler(ctx);
    expect(ctx.navigate).toHaveBeenCalledWith("/");
  });

  it("themeDark command invokes setTheme('dark')", () => {
    const dark = COMMANDS.find((c) => c.id === "settings.themeDark");
    const ctx = makeContext();
    dark?.handler(ctx);
    expect(ctx.setTheme).toHaveBeenCalledWith("dark");
  });

  it("signOut command calls ctx.signOut", () => {
    const signOut = COMMANDS.find((c) => c.id === "account.signOut");
    const ctx = makeContext();
    signOut?.handler(ctx);
    expect(ctx.signOut).toHaveBeenCalledOnce();
  });
});

describe("filterCommandsByPermission", () => {
  it("includes commands without a `requires` field", () => {
    const grants: Scope[] = [];
    const can = (scope: Scope) => grants.includes(scope);
    const visible = filterCommandsByPermission(COMMANDS, can);
    const homeVisible = visible.some((c) => c.id === "nav.home");
    expect(homeVisible).toBe(true);
  });

  it("hides commands whose required scope is not granted", () => {
    const can = () => false;
    const visible = filterCommandsByPermission(COMMANDS, can);
    expect(visible.some((c) => c.id === "nav.admin")).toBe(false);
    expect(visible.some((c) => c.id === "nav.billing")).toBe(false);
  });

  it("shows admin command when admin:access is granted", () => {
    const can = (scope: Scope) => scope === "admin:access";
    const visible = filterCommandsByPermission(COMMANDS, can);
    expect(visible.some((c) => c.id === "nav.admin")).toBe(true);
  });

  it("returns a new array (immutability)", () => {
    const can = () => true;
    const visible = filterCommandsByPermission(COMMANDS, can);
    expect(visible).not.toBe(COMMANDS);
  });
});

describe("groupBySection", () => {
  it("groups commands into the configured sections", () => {
    const can = () => true;
    const visible = filterCommandsByPermission(COMMANDS, can);
    const grouped = groupBySection(visible);

    expect(grouped.navigation.length).toBeGreaterThan(0);
    expect(grouped.actions.length).toBeGreaterThan(0);
    expect(grouped.settings.length).toBeGreaterThan(0);
    expect(grouped.account.length).toBeGreaterThan(0);
    expect(grouped.admin.length).toBeGreaterThan(0);
  });

  it("preserves section order keys", () => {
    const grouped = groupBySection([]);
    expect(Object.keys(grouped)).toEqual([...SECTION_ORDER]);
  });
});
