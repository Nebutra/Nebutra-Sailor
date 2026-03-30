#!/usr/bin/env tsx

/**
 * Sync brand assets to app public directories
 *
 * Usage: pnpm brand:sync
 */

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const brandRoot = resolve(__dirname, "..");
const monorepoRoot = resolve(brandRoot, "../..");

// Apps to sync brand assets to
const apps = ["apps/landing-page", "apps/web", "apps/studio", "apps/tsekaluk-dev"];

// Assets to sync
const assetMappings = [
  // Favicon
  { src: "assets/favicon/favicon.ico", dest: "public/favicon.ico" },

  // Logo folder (v1.0 classic)
  { src: "assets/logo", dest: "public/brand", isDir: true },

  // Logo folder (v2.0 compliant)
  { src: "assets/logo-compliant", dest: "public/brand-compliant", isDir: true },
];

function md5File(filePath: string): string {
  const data = readFileSync(filePath);
  return createHash("md5").update(data).digest("hex");
}

function verifyDirectorySync(srcDir: string, destDir: string): { ok: number; mismatch: string[] } {
  const files = readdirSync(srcDir).filter((f) => !f.startsWith("."));
  let ok = 0;
  const mismatch: string[] = [];

  for (const file of files) {
    const srcFile = join(srcDir, file);
    const destFile = join(destDir, file);

    if (!existsSync(destFile)) {
      mismatch.push(`${file}: missing in destination`);
      continue;
    }

    const srcHash = md5File(srcFile);
    const destHash = md5File(destFile);

    if (srcHash === destHash) {
      ok++;
    } else {
      mismatch.push(`${file}: MD5 mismatch (src=${srcHash} dest=${destHash})`);
    }
  }

  return { ok, mismatch };
}

/* eslint-disable no-console -- CLI script with intentional stdout logging */
function syncAssets() {
  let totalErrors = 0;

  for (const app of apps) {
    const appPath = join(monorepoRoot, app);

    if (!existsSync(appPath)) {
      continue;
    }

    for (const mapping of assetMappings) {
      const srcPath = join(brandRoot, mapping.src);
      const destPath = join(appPath, mapping.dest);

      if (!existsSync(srcPath)) {
        continue;
      }

      // Ensure destination directory exists
      const destDir = mapping.isDir ? destPath : dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      try {
        if (mapping.isDir) {
          cpSync(srcPath, destPath, { recursive: true });
        } else {
          cpSync(srcPath, destPath);
        }

        // MD5 verification for directory syncs
        if (mapping.isDir) {
          const result = verifyDirectorySync(srcPath, destPath);
          if (result.mismatch.length > 0) {
            for (const _m of result.mismatch) {
            }
            totalErrors += result.mismatch.length;
          } else {
          }
        }
      } catch (_error) {
        totalErrors++;
      }
    }
  }

  if (totalErrors > 0) {
  }
}

syncAssets();
