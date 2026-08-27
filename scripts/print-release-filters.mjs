#!/usr/bin/env node
import { getReleaseSurfaceDiagnostics } from "./lib/release-surface.mjs";

const diagnostics = getReleaseSurfaceDiagnostics();

const filters = diagnostics.publishable
  .map((entry) => entry.manifest.name)
  .filter(Boolean)
  .map((name) => `--filter=${name}`);

process.stdout.write(`${filters.join(" ")}\n`);
