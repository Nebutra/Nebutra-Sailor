# Scaffold and run

## Create a project

Pick a new directory that is not the home directory or a filesystem root. Then
preview, and scaffold:

```bash
npx create-sailor@latest my-app --dry-run --json   # planned actions, writes nothing
npx create-sailor@latest my-app --yes --json       # scaffold, install, git init
```

`create-sailor --help` lists every option. There are no stack, provider or
region flags; the only options are mechanical:

| Option | Effect |
|---|---|
| `[name]` | target folder or path; `.` scaffolds into the current (empty) folder |
| `-y, --yes` | non-interactive |
| `--json` | NDJSON events on stdout, one object per line |
| `--dry-run` | print the plan, write nothing |
| `--no-install` / `--no-git` | skip `pnpm install` / `git init` |
| `-p, --pm <id>` | package manager; pnpm is the supported one |
| `--preset <code>` | apply a look from Sailor Studio (preset code or design-language id) |

### Reading `--json` output

Every line is an object with an `event` field:

- `{"event":"start","version":"…"}` — the create-sailor version.
- `{"event":"step","step":"<name>","status":"start|ok|skip|warn|pending|error"}`
  — steps include `clone`, `config`, `governance-lints`, `compliance`, `env`,
  `license`, `install`, `brand`, `git-init`. `install` with `status:"error"` and
  `brand` with `status:"warn"` or `"pending"` are recoverable: run `pnpm install`
  and the first `pnpm dev` applies the brand.
- `{"event":"done","status":"ok","elapsedSec":N,"targetDir":"…"}` — success.
- `{"event":"error","code":"…","message":"…"}` — failure. Codes you can act on:
  `PNPM_MISSING` (install pnpm 11), `INVALID_PROJECT_NAME`, `UNSAFE_TARGET_DIR`
  (choose a different folder).

Check the exit code as well: `0` success, `1` failure, `2` bad `--preset`,
`130` cancelled.

## Run it locally

```bash
cd my-app
pnpm dev
```

No keys, Docker or database setup are needed. `pnpm dev` starts:

- the product app — `http://localhost:3001`, open `/welcome`
- the site — `http://localhost:3000`
- the API gateway — `http://localhost:3002`

If a port is taken it moves to the same port in the next thousand (3001 →
4001), so read the URLs `pnpm dev` prints instead of assuming them. The local
database is PGlite (`DATABASE_URL="pglite:"`, data under `.nebutra/pglite/`),
seeded with a demo account: `admin@example.com` / `preview-demo`.
`.sailor/next-steps.md` in the project repeats this.

### Use a real Postgres (optional)

```bash
pnpm infra:up        # optional: local Postgres and Redis via docker-compose
# set DATABASE_URL in .env.local to that Postgres, then:
pnpm db:migrate
pnpm db:seed
```

## Capabilities: read, act, re-read

```bash
npx nebutra@latest status --json
```

returns `{ stack, locale, capabilities: [{ name, state, provider, missing, next }] }`
where `state` is one of:

- `live` — a provider's keys are present.
- `local-fallback` — runs on a local implementation (console email, memory
  queue, local storage, dev auth). `pnpm dev` works.
- `missing-key` — nothing runs until a key is set; `missing` lists the keys.

Loop: read `status`, copy the keys named in `missing` / `next` from
`.env.example` into `.env.local` (generated secrets are already there), restart
`pnpm dev`, read `status` again. Ask the user for real provider keys; never
invent or commit them. `npx nebutra@latest sync --json` makes `.env.example`
and `.env.local` agree with the capabilities declared in `nebutra.config.json`
(`--dry-run` previews and exits 10).

## Make it yours

`brand.config.ts` carries the project name. Edit name, colours or links, then
`pnpm brand:apply`. To swap the whole look for a Sailor Studio preset:
`npx nebutra@latest apply --preset <code>`.

## Sign in (device flow)

Only needed for the buyer identity (license record, template updates). It is
not needed to run or deploy the project.

```bash
npx nebutra@latest login --json         # prints verification_uri_complete, user_code; exits 0
# give the user verification_uri_complete; they confirm in the browser
npx nebutra@latest login --poll --json  # resumes and blocks until approved, denied or expired
npx nebutra@latest whoami
```

The token is stored in the OS keychain (fallback
`~/.config/nebutra/credentials.json`). In CI use `NEBUTRA_TOKEN`.

## Checks before you hand back

```bash
pnpm lint         # Biome + the governance ratchets
pnpm typecheck
pnpm test
pnpm build
```

Run the ones relevant to what you changed and report which ran.
