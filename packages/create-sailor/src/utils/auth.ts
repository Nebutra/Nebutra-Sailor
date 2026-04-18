import fs from "node:fs";
import path from "node:path";

/**
 * Auth selection applier for create-sailor.
 *
 * Maps the `--auth` CLI flag to concrete filesystem mutations in the scaffolded
 * project:
 *  - `clerk`      → keep `packages/auth/src/providers/clerk.ts`, drop better-auth
 *  - `betterauth` → keep `packages/auth/src/providers/better-auth.ts`, drop clerk
 *  - `none`       → remove the entire `packages/auth` directory
 *
 * Silent-skip semantics: if a file targeted for deletion does not exist, we
 * carry on (template may not include it yet).
 */

export type AuthChoice = "clerk" | "betterauth" | "none";

function safeRm(target: string): void {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function appendEnv(targetDir: string, content: string): void {
  const envExamplePath = path.join(targetDir, ".env.example");
  if (fs.existsSync(envExamplePath)) {
    fs.appendFileSync(envExamplePath, "\n" + content);
  } else {
    fs.writeFileSync(envExamplePath, content);
  }
}

function narrowAuthProviderId(typesPath: string, providerId: "clerk" | "better-auth"): void {
  if (!fs.existsSync(typesPath)) return;
  const content = fs.readFileSync(typesPath, "utf8");
  const next = content.replace(
    /export type AuthProviderId\s*=\s*"[^"]+"\s*\|\s*"[^"]+";/,
    `export type AuthProviderId = "${providerId}";`,
  );
  if (next !== content) {
    fs.writeFileSync(typesPath, next);
  }
}

function appendReadmeNote(targetDir: string, note: string): void {
  const readmePath = path.join(targetDir, "README.md");
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, note);
    return;
  }
  fs.appendFileSync(readmePath, "\n" + note);
}

export async function applyAuthSelection(targetDir: string, auth: AuthChoice): Promise<void> {
  const authPkgDir = path.join(targetDir, "packages", "auth");
  if (!fs.existsSync(authPkgDir)) return;

  if (auth === "none") {
    safeRm(authPkgDir);
    appendReadmeNote(
      targetDir,
      "\n## Auth\n\nAuth was skipped at scaffold time (`--auth=none`). " +
        "Add your preferred auth provider manually (e.g. Clerk, Better Auth, NextAuth).\n",
    );
    return;
  }

  const providersDir = path.join(authPkgDir, "src", "providers");
  const typesPath = path.join(authPkgDir, "src", "types.ts");

  if (auth === "clerk") {
    safeRm(path.join(providersDir, "better-auth.ts"));
    narrowAuthProviderId(typesPath, "clerk");
    appendEnv(targetDir, "# Clerk auth\nCLERK_PUBLISHABLE_KEY=\nCLERK_SECRET_KEY=\n");
    return;
  }

  if (auth === "betterauth") {
    safeRm(path.join(providersDir, "clerk.ts"));
    narrowAuthProviderId(typesPath, "better-auth");
    appendEnv(
      targetDir,
      "# Better Auth\nBETTER_AUTH_SECRET=\nBETTER_AUTH_URL=http://localhost:3000\n",
    );
    return;
  }
}
