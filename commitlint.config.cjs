/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of the following
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation only changes
        "style", // Code style (formatting, semicolons, etc)
        "refactor", // Code refactoring (no feature/fix)
        "perf", // Performance improvements
        "test", // Adding or updating tests
        "build", // Build system or external dependencies
        "ci", // CI configuration
        "chore", // Other changes (maintenance)
        "revert", // Revert a previous commit
        "wip", // Work in progress
      ],
    ],
    // Scope can be any of the monorepo packages/apps/services
    "scope-enum": [
      1, // Warning level (not error)
      "always",
      [
        // Apps
        "web",
        "landing-page",
        "api-gateway",
        "storybook",
        "design-docs",
        "studio",
        // Packages
        "ui",
        "db",
        "theme",
        "tokens",
        "icons",
        "brand",
        "rate-limit",
        "cache",
        "event-bus",
        "saga",
        "mcp",
        "errors",
        "logger",
        "alerting",
        "analytics",
        "billing",
        "audit",
        "preset",
        "contracts",
        // Services
        "ai",
        // Infrastructure
        "infra",
        "inngest",
        "supabase",
        // Other
        "deps",
        "release",
        "config",
      ],
    ],
    // Subject should not be empty
    "subject-empty": [2, "never"],
    // Subject should not end with period
    "subject-full-stop": [2, "never", "."],
    // Subject case should be lowercase
    "subject-case": [2, "always", "lower-case"],
    // Type should not be empty
    "type-empty": [2, "never"],
    // Type case should be lowercase
    "type-case": [2, "always", "lower-case"],
    // Header max length
    "header-max-length": [2, "always", 100],
    // Body max line length
    "body-max-line-length": [1, "always", 200],
  },
  helpUrl: "https://github.com/conventional-changelog/commitlint/#what-is-commitlint",
};

module.exports = config;
