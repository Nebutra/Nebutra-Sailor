#!/usr/bin/env node
/**
 * Unscoped CLI packages (`create-sailor`, `nebutra`) cannot be published
 * by the org-scoped `NPM_TOKEN`. They must stay listed in
 * `config/npm-publish-identity.json` and ship via trusted publishing.
 */
import {
  formatTrustedPublisherSetup,
  getNpmPublishIdentityDiagnostics,
} from "./lib/npm-publish-identity.mjs";

const diagnostics = getNpmPublishIdentityDiagnostics();
const failures = [
  ...diagnostics.missingFromConfig.map(
    (name) =>
      `${name} is an unscoped publishable package but is missing from ${diagnostics.identityPath}. Add it with publishIdentity: "trusted-publishing".`,
  ),
  ...diagnostics.extraInConfig.map(
    (name) =>
      `${diagnostics.identityPath} lists ${name}, which is not a publishable workspace package.`,
  ),
];

if (diagnostics.identity.workflowFile !== "release.yml") {
  failures.push(
    `${diagnostics.identityPath} workflowFile must stay "release.yml" so npm trusted publishers match the Release workflow filename.`,
  );
}

console.log(
  `[npm-publish-identity] ${diagnostics.listed.length} unscoped package(s) require trusted publishing: ${diagnostics.listed.join(", ")}`,
);

if (failures.length > 0) {
  console.error("[npm-publish-identity] publish identity is not governed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  for (const name of diagnostics.missingFromConfig) {
    console.error(formatTrustedPublisherSetup(diagnostics.identity, name));
  }
  process.exit(1);
}

console.log("[npm-publish-identity] unscoped packages are listed for OIDC trusted publishing");
