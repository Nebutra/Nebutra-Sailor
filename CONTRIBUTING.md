# Contributing to Nebutra-Sailor

We're building the world's most advanced AI-native SaaS template and OPC ecosystem. We'd love your help.

Whether you're fixing bugs, building new integrations, improving documentation, or contributing design work—your contributions make Nebutra-Sailor better for everyone.

---

## Contributor License Agreement (CLA)

**Before you contribute, please read this section carefully.**

### Why we need a CLA

Nebutra-Sailor is licensed under **AGPL-3.0 with commercial license exceptions**. This dual-licensing model enables us to:

- Offer the codebase to the open-source community under copyleft terms
- License derivatives to commercial customers under proprietary terms
- Sustain full-time development of the project

To maintain this flexibility, we ask all contributors to grant Nebutra Technologies a broad license to their contributions.

### What you grant

By contributing code, documentation, translations, or other creative work to Nebutra-Sailor, you agree to grant Nebutra Technologies a:

- **Perpetual** license (no expiration)
- **Irrevocable** license (cannot be taken back)
- **Worldwide** license (applies globally)
- **Royalty-free** license (no fees)
- License to use, reproduce, modify, sublicense, and distribute your contributions under **any license** (including AGPL-3.0, commercial licenses, or future licenses)

### You retain copyright

We're not asking you to transfer copyright—**you keep it**. We're simply asking for permission to use your work in the ways described above. This is a common practice in dual-licensed open-source projects (MongoDB, Elastic, Qt, Nextcloud, etc.).

### How it works

1. **For small contributions** (< 100 lines): Your agreement is implicit
   - By opening a PR, you agree to the CLA terms
   - No additional signature required

2. **For significant contributions** (100+ lines of code): A CLA signature may be requested
   - We'll ask you to sign via [cla-assistant.io](https://cla-assistant.io)
   - Takes ~2 minutes
   - You sign once; subsequent PRs don't require re-signing

### Questions about the CLA?

If you have concerns about licensing your contributions, please reach out:

- **Email:** contributors@nebutra.dev
- **Discord:** [discord.nebutra.dev](https://discord.nebutra.dev) → #contributors

We're happy to discuss custom terms for significant contributions.

---

## How to Contribute

### 1. Set up your environment

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_GITHUB_USERNAME/nebutra-sailor.git
cd nebutra-sailor

# Install dependencies
pnpm install

# Create a feature branch
git checkout -b feat/my-awesome-feature
```

### 2. Follow the code style

Nebutra-Sailor has opinionated conventions documented in [CLAUDE.md](./CLAUDE.md). Before writing code, please read:

- **Component generation rules** — use semantic tokens, not hardcoded hex values
- **Imports** — always import from the right package (`@nebutra/ui`, not `@primer/react`)
- **Tailwind CSS** — use CSS variables and semantic tokens
- **Brand gradients** — predefined and consistent across the codebase
- **Animations** — use `AnimateIn` component, not raw `motion.div`
- **Accessibility** — every interactive component needs `aria-label`, focus rings, keyboard navigation

### 3. Write Storybook stories for UI components

Any new UI component **must** include a Storybook story. Stories are how we document and test components:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./my-component";

const meta: Meta<typeof MyComponent> = {
  title: "Primitives/MyComponent",  // or "Patterns/", "Marketing/"
  component: MyComponent,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof MyComponent>;

export const Default: Story = { args: { /* ... */ } };
export const AllVariants: Story = { render: () => ( /* showcase */ ) };
```

**Run Storybook locally to verify:**
```bash
pnpm --filter @nebutra/storybook dev
# → http://localhost:6006
```

### 4. Open a pull request

- Write a clear PR title and description
- Reference any related issues: "Fixes #123"
- Keep commits atomic and logical
- Use conventional commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

**Example:**
```
feat: add DataTable component with sorting and pagination

- Implement sortable columns with visual indicators
- Add pagination controls (first, last, prev, next)
- Support loading and empty states
- Include Storybook stories for all variants

Fixes #456
```

### 5. Address review feedback

- Be open to suggestions—code reviews are collaborative
- Update your branch and force-push to your PR: `git push -f`
- Reply to comments to confirm changes

### 6. Celebrate!

Once approved, we'll merge your PR. You'll see your contribution in the next release.

---

## Types of Contributions We Welcome

### Bug Fixes
- Found a crash? A visual glitch? A typo? 🙌
- Include steps to reproduce
- If possible, add a test or Storybook story that catches the bug

### New Integrations
Nebutra-Sailor uses provider-agnostic abstractions. You can add:
- **New queue providers** (e.g., new message broker support)
- **New search providers** (e.g., new search engine)
- **New notification channels** (e.g., Telegram, Discord)
- **New upload backends** (e.g., new cloud storage)
- **New permission engines** (e.g., new RBAC provider)

Structure your integration following the existing provider pattern in [CLAUDE.md](./CLAUDE.md).

### New AI/OPC Features
- AI-assisted code generation
- OPC automation workflows
- Agent frameworks
- Multi-model support

Start a discussion in [Discord](https://discord.nebutra.dev) before investing time—we want to make sure your idea aligns with the roadmap.

### Documentation Improvements
- Clarify confusing sections
- Add examples
- Improve API documentation
- Translate docs to other languages

### Storybook Stories
- Add missing stories for undocumented components
- Create usage examples that showcase less obvious patterns
- Add accessibility annotations

### Translations (i18n)
- Translate the UI and docs to your language
- Update language packs in `/packages/i18n/locales/`

---

## Contributions We Can't Accept

### Breaking Changes
- Must be discussed in an issue first
- Requires consensus from maintainers
- Usually deferred to major version releases

### Dependencies That Conflict with AGPL
- We can't add GPL-compatible dependencies unless we relicense
- Check dual-licensing compatibility before proposing
- Ask in Discord if unsure

### Telemetry & Tracking Without Consent
- Any analytics or user tracking must be **opt-in** only
- Privacy is a core value—we won't collect data without explicit permission
- Document all telemetry clearly

### Large Monolithic Changes
- Split large refactors into smaller PRs
- Easier to review, easier to fix if something breaks
- We're more likely to merge focused, single-purpose PRs

---

## Testing & Quality

### Run tests locally

```bash
pnpm test
pnpm --filter @nebutra/ui test
```

### Run typechecks

```bash
pnpm typecheck
pnpm --filter @nebutra/ui typecheck
pnpm --filter @nebutra/storybook typecheck
```

### Lint & format

```bash
pnpm lint
pnpm format
```

All CI checks must pass before we can merge. (Don't worry—we can help fix issues!)

---

## Development Workflow

### Useful commands

```bash
# Run Storybook to preview components
pnpm --filter @nebutra/storybook dev

# Start the landing page locally
pnpm --filter @nebutra/landing-page dev

# Start the web dashboard
pnpm --filter @nebutra/web dev

# Run the API gateway
pnpm --filter @nebutra/api-gateway dev

# Generate a new color palette (for rebranding contributions)
node scripts/generate-palette.mjs --primary=#7C3AED --secondary=#F59E0B
```

### Git workflow

```bash
# Create a feature branch
git checkout -b feat/my-feature

# Commit frequently with clear messages
git commit -m "feat: add button variant"

# Push to your fork
git push origin feat/my-feature

# Open a PR on GitHub
```

---

## Community & Communication

### Get help

- **Discord:** [discord.nebutra.dev](https://discord.nebutra.dev) → #contributors, #general, #questions
- **GitHub Discussions:** [github.com/nebutra/nebutra-sailor/discussions](https://github.com/nebutra/nebutra-sailor/discussions)
- **Email:** contributors@nebutra.dev

### Stay in the loop

- **Changelog:** [nebutra.dev/changelog](https://nebutra.dev/changelog)
- **Roadmap:** [github.com/nebutra/nebutra-sailor/projects](https://github.com/nebutra/nebutra-sailor/projects)
- **Twitter:** [@nebutra_ai](https://twitter.com/nebutra_ai)
- **Updates:** Subscribe to the mailing list at [nebutra.dev](https://nebutra.dev)

### Code of Conduct

We're building an inclusive community. Be respectful, kind, and constructive in all interactions. All contributors are expected to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Licensing & Legal

By contributing to Nebutra-Sailor, you agree to:

1. The **Contributor License Agreement** (CLA) outlined in this file
2. License your contributions under AGPL-3.0 (same as the project)
3. Grant Nebutra Technologies the rights described above

See [LICENSE-COMMERCIAL.md](./LICENSE-COMMERCIAL.md) for the commercial licensing model.

---

## Recognition

Contributors are recognized in:

- **GitHub:** Automatically via commit history
- **Changelog:** Major contributors listed in release notes
- **Docs:** Contributor page at nebutra.dev/contributors
- **Hall of Fame:** Top contributors featured on our website

We're grateful for your work.

---

## Questions?

- 💬 Ask in [Discord](https://discord.nebutra.dev)
- 📧 Email: contributors@nebutra.dev
- 🐦 Tweet [@nebutra_ai](https://twitter.com/nebutra_ai)

Thank you for contributing to the OPC revolution.

---

*Last updated: March 2026*
