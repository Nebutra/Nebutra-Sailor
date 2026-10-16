# Contributing to Nebutra-Sailor

Sailor is the open-source (Apache-2.0) production layer for agent-built software. We'd love your help.

Whether you're fixing bugs, building new integrations, improving documentation, or contributing design work—your contributions make Nebutra-Sailor better for everyone.

---

## Contributor License Agreement (CLA)

**Before you contribute, please read this section carefully.**

### Why we need a CLA

Nebutra-Sailor — the repository, every npm package, and every project `create-sailor` generates — is licensed under **Apache-2.0**. Contributions are accepted under Apache-2.0 too: section 5 of the licence makes inbound equal outbound. Substantial contributions may additionally be asked to sign the CLA, which lets us:

- relicense when it is in users' interest — as happened on 2026-07-26 (off AGPL-3.0) and on 2026-10-16 (to Apache-2.0), both to remove obstacles to adoption — without tracking down every past contributor;
- offer enterprise agreements with indemnification, which requires holding the rights we indemnify.

To keep that flexibility, we ask all contributors to grant Wuxi Nebutra Intelligence Technology Co., Ltd. a broad licence to their contributions.

### What you grant

By contributing code, documentation, translations, or other creative work to Nebutra-Sailor, you agree to grant Nebutra Technologies a:

- **Perpetual** license (no expiration)
- **Irrevocable** license (cannot be taken back)
- **Worldwide** license (applies globally)
- **Royalty-free** license (no fees)
- License to use, reproduce, modify, sublicense, and distribute your contributions under **any license** (including Apache-2.0 or future licenses)

### You retain copyright

We're not asking you to transfer copyright—**you keep it**. We're simply asking for permission to use your work in the ways described above. This is common practice in company-led open-source projects (Apache Software Foundation, Google, Qt, Nextcloud, etc.).

### How it works

We use the [cla-assistant.io](https://cla-assistant.io) GitHub Action — see
[`.github/workflows/cla.yml`](./.github/workflows/cla.yml). When you open a PR:

1. The CLA bot posts a comment linking to the full agreement at
   [`docs/legal/CLA.md`](./docs/legal/CLA.md).
2. Reply to that comment with this exact sentence:
   > `I have read the CLA Document and I hereby sign the CLA`
3. The bot stores your signature and flips your PR's `license/cla` check
   to green.
4. **You sign once.** Every future PR you open is pre-signed.

Bots in the workflow allowlist (`dependabot`, `github-actions`, `renovate`)
are never asked to sign. See
[`docs/legal/contributing-with-cla.md`](./docs/legal/contributing-with-cla.md)
for the full workflow, edge cases (employer IP, corporate CLA, signature
revocation), and FAQ.

### Questions about the CLA?

If you have concerns about licensing your contributions, please reach out:

- **Email:** contributors@nebutra.com
- **Discord:** [nebutra.com/discord](https://nebutra.com/discord) → #contributors

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

Start a discussion in [Discord](https://nebutra.com/discord) before investing time—we want to make sure your idea aligns with the roadmap.

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

### Copyleft Dependencies
- We can't take GPL-2.0/3.0, AGPL, SSPL, or EUPL dependencies — they are incompatible with an Apache-2.0 distribution
- This is **stricter** than under the old AGPL licence, which could absorb GPL-3.0 code
- The machine-enforced allow/deny list is [`license-policy.json`](./license-policy.json); `pnpm license:check` runs it
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
pnpm --filter @nebutra/landing dev

# Start the web dashboard
pnpm --filter @nebutra/web dev

# Run the API gateway
pnpm --filter @nebutra/gateway dev

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

- **Discord:** [nebutra.com/discord](https://nebutra.com/discord) → #contributors, #general, #questions
- **GitHub Discussions:** [github.com/nebutra/nebutra-sailor/discussions](https://github.com/nebutra/nebutra-sailor/discussions)
- **Email:** contributors@nebutra.com

### Stay in the loop

- **Changelog:** [nebutra.com/changelog](https://nebutra.com/changelog)
- **Roadmap:** [github.com/nebutra/nebutra-sailor/projects](https://github.com/nebutra/nebutra-sailor/projects)
- **Twitter:** [@nebutra_ai](https://twitter.com/nebutra_ai)
- **Updates:** Subscribe to the mailing list at [nebutra.com](https://nebutra.com)

### Code of Conduct

We're building an inclusive community. Be respectful, kind, and constructive in all interactions. All contributors are expected to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Licensing & Legal

By contributing to Nebutra-Sailor, you agree to:

1. The **Contributor License Agreement** (CLA) outlined in this file
2. License your contributions under the project licence, Apache-2.0 (section 5)
3. Grant Wuxi Nebutra Intelligence Technology Co., Ltd. the rights described above

Paid plans sell support, never permission: see [Commercial Support](./docs/legal/commercial-support.md).

---

## Recognition

Contributors are recognized in:

- **GitHub:** Automatically via commit history
- **Changelog:** Major contributors listed in release notes
- **Docs:** Contributor page at nebutra.com/contributors
- **Hall of Fame:** Top contributors featured on our website

We're grateful for your work.

---

## Questions?

- 💬 Ask in [Discord](https://nebutra.com/discord)
- 📧 Email: contributors@nebutra.com
- 🐦 Tweet [@nebutra_ai](https://twitter.com/nebutra_ai)

Thank you for contributing to the OPC revolution.

---

*Last updated: March 2026*
