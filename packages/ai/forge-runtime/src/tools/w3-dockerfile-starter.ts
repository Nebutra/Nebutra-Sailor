/**
 * W3 · template root — Dockerfile starter generator.
 *
 * Brief: docs/plans/tools/dockerfile-starter.md. The brief's §2a establishes
 * that `docker init` already gets layer order, multi-stage and non-root right
 * for its eight language templates — so those are the *bar*, not the pitch.
 * What survives as a reason to exist is access (no Docker install of any kind,
 * agent-callable over a deterministic schema) plus framework-level presets
 * where Docker's own templates stop at the language level (§2a.2 point 3,
 * §7 point 6).
 *
 * Spec implemented: the Dockerfile reference (`# syntax=docker/dockerfile:1`)
 * and BuildKit's `RUN --mount=type=cache` frontend — not a wrapper around some
 * library. Everything here is string synthesis: pure, deterministic, offline.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── vocabulary ────────────────────────────────────────────────────────── */

const LANGUAGES = ["node", "python", "go", "java", "ruby", "rust"] as const;
type Language = (typeof LANGUAGES)[number];

const FRAMEWORKS = [
  "none",
  "express",
  "next",
  "nest",
  "vite",
  "django",
  "fastapi",
  "flask",
  "spring-boot",
  "rails",
  "sinatra",
] as const;
type Framework = (typeof FRAMEWORKS)[number];

const PACKAGE_MANAGERS = [
  "auto",
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "pip",
  "poetry",
  "uv",
  "maven",
  "gradle",
  "bundler",
  "cargo",
  "gomod",
] as const;
type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const BASE_VARIANTS = ["slim", "alpine", "full"] as const;
type BaseVariant = (typeof BASE_VARIANTS)[number];

/** Framework presets are scoped to a language — the schema enforces this. */
const FRAMEWORKS_BY_LANGUAGE: Record<Language, readonly Framework[]> = {
  node: ["none", "express", "next", "nest", "vite"],
  python: ["none", "django", "fastapi", "flask"],
  go: ["none"],
  java: ["none", "spring-boot"],
  ruby: ["none", "rails", "sinatra"],
  rust: ["none"],
};

/** First entry is the default when `packageManager: "auto"`. */
const PMS_BY_LANGUAGE: Record<Language, readonly PackageManager[]> = {
  node: ["npm", "pnpm", "yarn", "bun"],
  python: ["pip", "poetry", "uv"],
  go: ["gomod"],
  java: ["maven", "gradle"],
  ruby: ["bundler"],
  rust: ["cargo"],
};

/**
 * When the default runtime tags below were last reviewed. A generator that
 * ships language versions has a shelf life: a default that was the current LTS
 * at pin time quietly becomes an unsupported runtime, and the user has no way
 * to know which it is. The date is stated in the engine metadata and in a
 * warning whenever the caller accepts the default instead of naming a version.
 */
const DEFAULT_VERSION_PINNED = "2026-07";

const DEFAULT_VERSION: Record<Language, string> = {
  node: "22",
  python: "3.12",
  go: "1.23",
  java: "21",
  ruby: "3.3",
  rust: "1.83",
};

const DEFAULT_PORT: Record<Framework, number> = {
  none: 8080,
  express: 3000,
  next: 3000,
  nest: 3000,
  vite: 8080,
  django: 8000,
  fastapi: 8000,
  flask: 8000,
  "spring-boot": 8080,
  rails: 3000,
  sinatra: 4567,
};

const LANGUAGE_DEFAULT_PORT: Record<Language, number> = {
  node: 3000,
  python: 8000,
  go: 8080,
  java: 8080,
  ruby: 3000,
  rust: 8080,
};

const ALPINE_TAG = "alpine:3.21";
const DEBIAN_TAG = "debian:bookworm-slim";

/* ── validation helpers ────────────────────────────────────────────────── */

const WORKDIR_RE = /^\/[A-Za-z0-9._\-/]{0,127}$/;
const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;
/** `&`, `|`, `;`, redirects, subshells, expansion — needs a shell to run. */
const SHELL_SYNTAX_RE = /[|&;<>()$`*?~]/;

/** A newline in a command would inject arbitrary Dockerfile instructions. */
const commandField = z
  .string()
  .min(1)
  .max(400)
  .refine((v) => !/[\r\n]/.test(v), {
    message: "command must be a single line (a newline would inject a Dockerfile instruction)",
  });

/**
 * Split a command into an exec-form argv. Honours single and double quotes;
 * returns null when quoting is unbalanced, so the caller can fall back to a
 * shell wrapper rather than emit a broken JSON array.
 */
export function tokenizeCommand(command: string): string[] | null {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let started = false;
  for (const ch of command) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }
    if (ch === " " || ch === "\t") {
      if (started) {
        tokens.push(current);
        current = "";
        started = false;
      }
      continue;
    }
    current += ch;
    started = true;
  }
  if (quote) return null;
  if (started) tokens.push(current);
  return tokens.length > 0 ? tokens : null;
}

/**
 * Know-how §7 #7: shell form swallows SIGTERM, so a container stops by SIGKILL
 * after the grace period instead of shutting down. Exec form when we can parse
 * the command; `sh -c "exec …"` when a shell is genuinely required — `exec`
 * replaces the shell so the signal still reaches PID 1's real process.
 */
function processCommand(
  keyword: "CMD" | "ENTRYPOINT",
  command: string,
  warn: (w: string) => void,
): string {
  const needsShell = SHELL_SYNTAX_RE.test(command);
  const argv = needsShell ? null : tokenizeCommand(command);
  if (argv) return `${keyword} ${JSON.stringify(argv)}`;
  warn(
    'The start command needs a shell, so it is wrapped as `sh -c "exec …"` — `exec` keeps the app as PID 1 so SIGTERM still reaches it.',
  );
  return `${keyword} ["/bin/sh","-c",${JSON.stringify(`exec ${command}`)}]`;
}

/* ── image naming ──────────────────────────────────────────────────────── */

function tagSuffix(variant: BaseVariant): string {
  if (variant === "alpine") return "-alpine";
  if (variant === "slim") return "-slim";
  return "";
}

type Distro = "alpine" | "debian";

interface UserPlan {
  /** Whether the base image already ships a usable non-root account. */
  readonly builtin: boolean;
  readonly name: string;
  readonly group: string;
  readonly createLine: string | null;
}

function userPlan(language: Language, pm: PackageManager, distro: Distro): UserPlan {
  // The official `node` images already ship a uid 1000 `node` account —
  // creating a second one is noise, and `USER node` is what the image expects.
  if (language === "node" && pm !== "bun") {
    return { builtin: true, name: "node", group: "node", createLine: null };
  }
  if (distro === "alpine") {
    return {
      builtin: false,
      name: "app",
      group: "app",
      createLine: "RUN addgroup -S app && adduser -S -G app app",
    };
  }
  return {
    builtin: false,
    name: "app",
    group: "app",
    createLine:
      "RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app --no-create-home app",
  };
}

/* ── resolved plan ─────────────────────────────────────────────────────── */

interface Plan {
  readonly language: Language;
  readonly framework: Framework;
  readonly pm: PackageManager;
  readonly variant: BaseVariant;
  readonly version: string;
  readonly workdir: string;
  readonly port: number;
  readonly buildCommand: string | null;
  readonly startCommand: string;
  readonly multiStage: boolean;
  readonly nonRootUser: boolean;
  readonly healthcheck: boolean;
  readonly hasDockerignore: boolean;
  readonly warn: (w: string) => void;
}

function manifests(language: Language, pm: PackageManager): string[] {
  if (language === "node") {
    if (pm === "pnpm") return ["package.json", "pnpm-lock.yaml"];
    if (pm === "yarn") return ["package.json", "yarn.lock"];
    // Bun 1.2 replaced the binary `bun.lockb` with a text `bun.lock`; the glob
    // covers both, and `package.json` guarantees the COPY still matches at
    // least one file (a COPY whose sources all miss fails the build).
    if (pm === "bun") return ["package.json", "bun.lock*"];
    return ["package.json", "package-lock.json"];
  }
  if (language === "python") {
    if (pm === "poetry") return ["pyproject.toml", "poetry.lock"];
    if (pm === "uv") return ["pyproject.toml", "uv.lock"];
    return ["requirements.txt"];
  }
  if (language === "go") return ["go.mod", "go.sum"];
  if (language === "java")
    return pm === "gradle" ? ["build.gradle", "settings.gradle"] : ["pom.xml"];
  if (language === "ruby") return ["Gemfile", "Gemfile.lock"];
  return ["Cargo.toml", "Cargo.lock"];
}

function defaultBuildCommand(language: Language, framework: Framework, pm: PackageManager) {
  if (language === "node") {
    if (framework === "next" || framework === "nest" || framework === "vite") {
      if (pm === "yarn") return "yarn build";
      if (pm === "bun") return "bun run build";
      if (pm === "pnpm") return "pnpm run build";
      return "npm run build";
    }
    return null;
  }
  if (language === "go") return "go build -trimpath -ldflags=-s -o /out/app .";
  if (language === "java") {
    return pm === "gradle"
      ? `gradle --no-daemon -x test ${framework === "spring-boot" ? "bootJar" : "build"}`
      : "mvn -B -DskipTests package";
  }
  if (language === "rust") return "cargo build --release --locked";
  if (language === "ruby" && framework === "rails") {
    return "SECRET_KEY_BASE_DUMMY=1 bundle exec rails assets:precompile";
  }
  return null;
}

function defaultStartCommand(
  language: Language,
  framework: Framework,
  pm: PackageManager,
  port: number,
  workdir: string,
): string {
  switch (framework) {
    case "next":
      return "node server.js";
    case "nest":
      return "node dist/main.js";
    case "django":
      return `gunicorn --bind 0.0.0.0:${port} myproject.wsgi:application`;
    case "fastapi":
      return `uvicorn app.main:app --host 0.0.0.0 --port ${port}`;
    case "flask":
      return `gunicorn --bind 0.0.0.0:${port} app:app`;
    case "rails":
      return `bundle exec rails server -b 0.0.0.0 -p ${port}`;
    case "sinatra":
      return `bundle exec ruby app.rb -o 0.0.0.0 -p ${port}`;
    default:
      break;
  }
  if (language === "node") return pm === "bun" ? "bun run server.js" : "node server.js";
  if (language === "python") return "python main.py";
  if (language === "java") return `java -XX:MaxRAMPercentage=75.0 -jar ${workdir}/app.jar`;
  return `${workdir}/app`;
}

/* ── per-language Dockerfile bodies ────────────────────────────────────── */

function nodeBody(p: Plan): string[] {
  const bun = p.pm === "bun";
  const distro: Distro = p.variant === "alpine" ? "alpine" : "debian";
  const image = bun
    ? `oven/bun:\${NODE_VERSION}${p.variant === "alpine" ? "-alpine" : ""}`
    : `node:\${NODE_VERSION}${tagSuffix(p.variant)}`;
  const user = userPlan("node", p.pm, distro);
  // `COPY --chown=<name>` resolves the name against the image's /etc/passwd at
  // build time. Only the official node image already has that account; for the
  // bun images the account is created in the tail, *after* these copies, so a
  // --chown here fails the build outright. Those images get the tail's
  // `RUN chown -R` instead, which runs once the user exists.
  const chown = p.nonRootUser && user.builtin ? `--chown=${user.name}:${user.group} ` : "";
  const files = manifests("node", p.pm).join(" ");
  const staticSite = p.framework === "vite";

  const install = (prod: boolean): string[] => {
    if (bun) {
      return [
        `RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile${prod ? " --production" : ""}`,
      ];
    }
    if (p.pm === "pnpm") {
      return [
        "ENV PNPM_HOME=/pnpm",
        'ENV PATH="$PNPM_HOME:$PATH"',
        "RUN corepack enable",
        `RUN --mount=type=cache,target=/pnpm/store pnpm install --frozen-lockfile${prod ? " --prod" : ""}`,
      ];
    }
    if (p.pm === "yarn") {
      return [
        `RUN --mount=type=cache,target=/usr/local/share/.cache/yarn yarn install --frozen-lockfile${prod ? " --production" : ""}`,
      ];
    }
    return [`RUN --mount=type=cache,target=/root/.npm npm ci${prod ? " --omit=dev" : ""}`];
  };

  const lines: string[] = [`ARG NODE_VERSION=${p.version}`, ""];

  if (!p.multiStage) {
    lines.push(
      `FROM ${image}`,
      `WORKDIR ${p.workdir}`,
      "# Manifests before source: this layer only rebuilds when dependencies change.",
      `COPY ${files} ./`,
      ...install(!p.buildCommand),
      "COPY . .",
    );
    if (p.buildCommand) lines.push(`RUN ${p.buildCommand}`);
    return lines;
  }

  lines.push(
    `FROM ${image} AS base`,
    `WORKDIR ${p.workdir}`,
    "",
    "FROM base AS deps",
    "# Manifests before source: this layer only rebuilds when dependencies change.",
    `COPY ${files} ./`,
    // Without a build step the deps stage is the production dependency set the
    // runtime copies; with one it must carry devDependencies so the build runs.
    ...install(!p.buildCommand),
    "",
  );

  if (p.buildCommand) {
    lines.push("FROM deps AS build", "COPY . .", `RUN ${p.buildCommand}`, "");
  }

  if (staticSite) {
    const nginx = p.nonRootUser ? "nginxinc/nginx-unprivileged:alpine" : "nginx:alpine";
    lines.push(
      `FROM ${nginx} AS runtime`,
      `COPY --from=build ${p.workdir}/dist /usr/share/nginx/html`,
      "# The image already runs as a non-root user; do not add USER root here.",
    );
    return lines;
  }

  lines.push(
    "FROM base AS runtime",
    "# NODE_ENV lands in the runtime stage only — setting it earlier makes the",
    "# package manager skip devDependencies and the build stage would fail.",
    "ENV NODE_ENV=production",
  );
  if (p.buildCommand) {
    // The build stage's node_modules holds devDependencies; install a clean
    // production set instead of shipping the builder's tree.
    lines.push(`COPY ${chown}${files} ./`, ...install(true));
    if (p.framework === "next") {
      lines.push(
        '# next.config must set `output: "standalone"` for these three copies.',
        `COPY ${chown}--from=build ${p.workdir}/.next/standalone ./`,
        `COPY ${chown}--from=build ${p.workdir}/.next/static ./.next/static`,
        `COPY ${chown}--from=build ${p.workdir}/public ./public`,
      );
    } else {
      lines.push(`COPY ${chown}--from=build ${p.workdir}/dist ./dist`);
    }
  } else {
    lines.push(
      `COPY ${chown}--from=deps ${p.workdir}/node_modules ./node_modules`,
      `COPY ${chown}. .`,
    );
  }
  return lines;
}

function pythonBody(p: Plan): string[] {
  const image = `python:\${PYTHON_VERSION}${tagSuffix(p.variant)}`;
  const files = manifests("python", p.pm).join(" ");
  const installLines: string[] = [];
  if (p.pm === "poetry") {
    installLines.push(
      "RUN pip install poetry",
      `COPY ${files} ./`,
      "RUN --mount=type=cache,target=/root/.cache poetry install --only main --no-root",
    );
  } else if (p.pm === "uv") {
    installLines.push(
      "RUN pip install uv",
      `COPY ${files} ./`,
      "RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev",
    );
  } else {
    installLines.push(
      `COPY ${files} ./`,
      "RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt",
    );
  }

  const venv = [
    "RUN python -m venv /opt/venv",
    'ENV VIRTUAL_ENV=/opt/venv UV_PROJECT_ENVIRONMENT=/opt/venv PATH="/opt/venv/bin:$PATH"',
  ];

  const lines: string[] = [
    `ARG PYTHON_VERSION=${p.version}`,
    "",
    `FROM ${image} AS base`,
    "# Unbuffered stdout so container logs appear immediately, and no .pyc litter.",
    "ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1",
    `WORKDIR ${p.workdir}`,
    "",
  ];

  if (!p.multiStage) {
    lines.push(...venv, ...installLines, "COPY . .");
    if (p.buildCommand) lines.push(`RUN ${p.buildCommand}`);
    if (p.framework === "django") {
      lines.push(
        "# Static files need real settings at build time; enable once they are wired:",
        "# RUN python manage.py collectstatic --noinput",
      );
    }
    return lines;
  }

  lines.push("FROM base AS build", ...venv, ...installLines, "");
  if (p.buildCommand) lines.push("COPY . .", `RUN ${p.buildCommand}`, "");
  lines.push(
    "FROM base AS runtime",
    "COPY --from=build /opt/venv /opt/venv",
    'ENV PATH="/opt/venv/bin:$PATH"',
    "COPY . .",
  );
  if (p.framework === "django") {
    lines.push(
      "# Static files need real settings at build time; enable once they are wired:",
      "# RUN python manage.py collectstatic --noinput",
    );
  }
  return lines;
}

function goBody(p: Plan): string[] {
  const build = p.buildCommand ?? "go build -trimpath -ldflags=-s -o /out/app .";
  const builder = `golang:\${GO_VERSION}${p.variant === "alpine" ? "-alpine" : ""}`;
  const lines: string[] = [`ARG GO_VERSION=${p.version}`, ""];
  if (!p.multiStage) {
    return [
      ...lines,
      `FROM ${builder}`,
      `WORKDIR ${p.workdir}`,
      "ENV CGO_ENABLED=0",
      "COPY go.mod go.sum ./",
      "RUN --mount=type=cache,target=/go/pkg/mod go mod download",
      "COPY . .",
      `RUN ${build}`,
      `RUN cp /out/app ${p.workdir}/app`,
    ];
  }
  return [
    ...lines,
    `FROM ${builder} AS build`,
    "WORKDIR /src",
    "# CGO off produces a static binary that runs on a scratch/alpine runtime.",
    "ENV CGO_ENABLED=0",
    "COPY go.mod go.sum ./",
    "RUN --mount=type=cache,target=/go/pkg/mod go mod download",
    "COPY . .",
    `RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build ${build}`,
    "",
    `FROM ${p.variant === "alpine" ? ALPINE_TAG : DEBIAN_TAG} AS runtime`,
    p.variant === "alpine"
      ? "RUN apk add --no-cache ca-certificates"
      : "RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*",
    `WORKDIR ${p.workdir}`,
    `COPY --from=build /out/app ${p.workdir}/app`,
  ];
}

function javaBody(p: Plan): string[] {
  const gradle = p.pm === "gradle";
  const build = p.buildCommand ?? defaultBuildCommand("java", p.framework, p.pm) ?? "";
  const jarGlob = gradle ? "/build/build/libs/*.jar" : "/build/target/*.jar";
  const builder = gradle
    ? "gradle:8-jdk${JAVA_VERSION}"
    : "maven:3.9-eclipse-temurin-${JAVA_VERSION}";
  const runtime = `eclipse-temurin:\${JAVA_VERSION}-jre${p.variant === "alpine" ? "-alpine" : ""}`;
  const warmup = gradle
    ? "RUN --mount=type=cache,target=/home/gradle/.gradle gradle --no-daemon dependencies || true"
    : "RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline";
  const cache = gradle ? "/home/gradle/.gradle" : "/root/.m2";
  const lines: string[] = [`ARG JAVA_VERSION=${p.version}`, ""];
  if (!p.multiStage) {
    return [
      ...lines,
      `FROM ${builder}`,
      `WORKDIR ${p.workdir}`,
      `COPY ${manifests("java", p.pm).join(" ")} ./`,
      warmup,
      "COPY src ./src",
      `RUN --mount=type=cache,target=${cache} ${build}`,
      // Without this the jar stays under target/ (or build/libs/) and the
      // ENTRYPOINT's `-jar <workdir>/app.jar` points at a file that never
      // exists — the image builds and then dies on start.
      `RUN cp ${gradle ? "build/libs" : "target"}/*.jar ${p.workdir}/app.jar`,
    ];
  }
  return [
    ...lines,
    `FROM ${builder} AS build`,
    "WORKDIR /build",
    `COPY ${manifests("java", p.pm).join(" ")} ./`,
    "# Dependency resolution before sources: source edits keep the cached layer.",
    warmup,
    "COPY src ./src",
    `RUN --mount=type=cache,target=${cache} ${build}`,
    "",
    `FROM ${runtime} AS runtime`,
    `WORKDIR ${p.workdir}`,
    `COPY --from=build ${jarGlob} ${p.workdir}/app.jar`,
  ];
}

function rubyBody(p: Plan): string[] {
  const image = `ruby:\${RUBY_VERSION}${tagSuffix(p.variant)}`;
  const nativeDeps =
    p.variant === "alpine"
      ? "RUN apk add --no-cache build-base git"
      : "RUN apt-get update -qq && apt-get install -y --no-install-recommends build-essential git && rm -rf /var/lib/apt/lists/*";
  const lines: string[] = [
    `ARG RUBY_VERSION=${p.version}`,
    "",
    `FROM ${image} AS base`,
    "ENV BUNDLE_PATH=/usr/local/bundle BUNDLE_DEPLOYMENT=1 BUNDLE_WITHOUT=development:test",
    `WORKDIR ${p.workdir}`,
    "",
  ];
  if (!p.multiStage) {
    lines.push(nativeDeps, "COPY Gemfile Gemfile.lock ./", "RUN bundle install", "COPY . .");
    if (p.buildCommand) lines.push(`RUN ${p.buildCommand}`);
    return lines;
  }
  lines.push(
    "FROM base AS build",
    "# Native gem extensions need a toolchain that must not ship to production.",
    nativeDeps,
    "COPY Gemfile Gemfile.lock ./",
    'RUN bundle install && rm -rf "${BUNDLE_PATH}"/ruby/*/cache',
    "COPY . .",
  );
  if (p.buildCommand) lines.push(`RUN ${p.buildCommand}`);
  lines.push(
    "",
    "FROM base AS runtime",
    "COPY --from=build /usr/local/bundle /usr/local/bundle",
    `COPY --from=build ${p.workdir} ${p.workdir}`,
  );
  return lines;
}

function rustBody(p: Plan): string[] {
  const build = p.buildCommand ?? "cargo build --release --locked";
  const alpine = p.variant === "alpine";
  // The builder must match the runtime's libc. A Debian-built (glibc) binary
  // copied into `alpine:` does not start at all — the kernel cannot find its
  // dynamic loader, and the error ("no such file or directory" on a file that
  // is plainly there) tells the user nothing. rust:alpine targets musl.
  const builder = `rust:\${RUST_VERSION}-${alpine ? "alpine" : "slim"}`;
  const builderDeps = alpine
    ? [
        "# musl builds still need a C toolchain for crates with native code.",
        "RUN apk add --no-cache musl-dev",
      ]
    : [];
  const lines: string[] = [`ARG RUST_VERSION=${p.version}`, "ARG BIN_NAME=app", ""];
  if (!p.multiStage) {
    return [
      ...lines,
      `FROM ${builder}`,
      "ARG BIN_NAME",
      ...builderDeps,
      `WORKDIR ${p.workdir}`,
      "COPY Cargo.toml Cargo.lock ./",
      "RUN --mount=type=cache,target=/usr/local/cargo/registry cargo fetch --locked",
      "COPY . .",
      `RUN --mount=type=cache,target=/usr/local/cargo/registry ${build}`,
      // cargo leaves the binary under target/release/; the ENTRYPOINT runs
      // <workdir>/app, so it has to be put there.
      `RUN cp target/release/\${BIN_NAME} ${p.workdir}/app`,
    ];
  }
  return [
    ...lines,
    `FROM ${builder} AS build`,
    ...builderDeps,
    "WORKDIR /src",
    "COPY Cargo.toml Cargo.lock ./",
    "# Fetch against the manifests alone so source edits do not re-download crates.",
    "RUN --mount=type=cache,target=/usr/local/cargo/registry cargo fetch --locked",
    "COPY . .",
    `RUN --mount=type=cache,target=/usr/local/cargo/registry ${build}`,
    "",
    `FROM ${p.variant === "alpine" ? ALPINE_TAG : DEBIAN_TAG} AS runtime`,
    p.variant === "alpine"
      ? "RUN apk add --no-cache ca-certificates"
      : "RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*",
    `WORKDIR ${p.workdir}`,
    "ARG BIN_NAME",
    `COPY --from=build /src/target/release/\${BIN_NAME} ${p.workdir}/app`,
  ];
}

/* ── healthcheck ───────────────────────────────────────────────────────── */

function healthcheckLine(p: Plan): string | null {
  const url = `http://127.0.0.1:${p.port}/`;
  const head = "HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 CMD ";
  if (p.language === "node" && p.pm !== "bun") {
    // Node 18+ ships fetch, so the probe needs no extra binary in the image.
    const script = `fetch('${url}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`;
    return head + `${JSON.stringify(["node", "-e", script])}`;
  }
  if (p.language === "python") {
    const script = `import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('${url}').status < 400 else 1)`;
    return head + `${JSON.stringify(["python", "-c", script])}`;
  }
  p.warn(
    "HEALTHCHECK uses wget, which is present in alpine but not in the slim Debian images — install it or replace the probe.",
  );
  return head + `${JSON.stringify(["wget", "--no-verbose", "--tries=1", "--spider", url])}`;
}

/* ── .dockerignore + compose ───────────────────────────────────────────── */

const COMMON_IGNORES = [
  ".git",
  ".gitignore",
  ".github",
  "**/.DS_Store",
  "*.log",
  "Dockerfile",
  ".dockerignore",
  "docker-compose.yml",
  "compose.yaml",
  "README.md",
  ".vscode",
  ".idea",
];

const LANGUAGE_IGNORES: Record<Language, readonly string[]> = {
  node: ["node_modules", "npm-debug.log*", "dist", ".next", "coverage", ".turbo"],
  python: [
    "__pycache__/",
    "*.py[cod]",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    "*.egg-info",
  ],
  go: ["/out", "*.test"],
  java: ["target", "build", ".gradle"],
  ruby: ["tmp", "log", "vendor/bundle", ".bundle"],
  rust: ["target"],
};

function buildDockerignore(language: Language): string {
  return [
    "# Anything not listed here is sent to the daemon and can end up in a layer.",
    ...COMMON_IGNORES,
    ...LANGUAGE_IGNORES[language],
    "",
    "# Secrets must never reach the build context.",
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "",
  ].join("\n");
}

function buildCompose(p: Plan, listenPort: number): string {
  const env = p.language === "node" ? ["    environment:", "      - NODE_ENV=production"] : [];
  return [
    "# Compose Spec — no top-level `version:` key; Compose v2 warns it is obsolete.",
    "services:",
    "  app:",
    "    build:",
    "      context: .",
    "    ports:",
    `      # EXPOSE only documents a port; this mapping is what actually publishes it.`,
    `      - "${listenPort}:${listenPort}"`,
    ...env,
    "    restart: unless-stopped",
    "",
  ].join("\n");
}

/* ── generator ─────────────────────────────────────────────────────────── */

export interface DockerfileStarterInput {
  language: Language;
  framework?: Framework;
  packageManager?: PackageManager;
  baseVariant?: BaseVariant;
  languageVersion?: string;
  workdir?: string;
  port?: number;
  buildCommand?: string;
  startCommand?: string;
  multiStage?: boolean;
  nonRootUser?: boolean;
  includeDockerignore?: boolean;
  includeCompose?: boolean;
  includeHealthcheck?: boolean;
}

export interface DockerfileStarterOutput {
  dockerfile: string;
  dockerignore: string | null;
  dockerCompose: string | null;
  warnings: string[];
  meta: {
    language: Language;
    framework: Framework;
    packageManager: PackageManager;
    baseVariant: BaseVariant;
    languageVersion: string;
    workdir: string;
    listenPort: number;
    buildCommand: string | null;
    startCommand: string;
    multiStage: boolean;
    nonRootUser: boolean;
    stages: number;
  };
}

export function generateDockerfileStarter(input: DockerfileStarterInput): DockerfileStarterOutput {
  const warnings: string[] = [];
  const warn = (w: string) => {
    if (!warnings.includes(w)) warnings.push(w);
  };

  const language = input.language;
  const framework = input.framework ?? "none";
  const pm =
    input.packageManager && input.packageManager !== "auto"
      ? input.packageManager
      : (PMS_BY_LANGUAGE[language][0] as PackageManager);
  const variant = input.baseVariant ?? "slim";
  const version = input.languageVersion ?? (pm === "bun" ? "1" : DEFAULT_VERSION[language]);
  const workdir = (input.workdir ?? "/app").replace(/\/+$/, "") || "/app";
  const staticSite = language === "node" && framework === "vite";
  const requestedMultiStage = input.multiStage ?? true;
  // A static build is compiled by Node and served by nginx — two different
  // images. There is no honest single-stage shape for it.
  const multiStage = staticSite ? true : requestedMultiStage;
  if (staticSite && !requestedMultiStage) {
    warn(
      "A static site is built by Node and served by nginx, so multi-stage stays on — a single stage would ship the whole toolchain as the web server.",
    );
  }
  const nonRootUser = input.nonRootUser ?? true;
  const healthcheck = input.includeHealthcheck ?? false;
  const hasDockerignore = input.includeDockerignore ?? true;

  const port =
    input.port ??
    (framework === "none" ? LANGUAGE_DEFAULT_PORT[language] : DEFAULT_PORT[framework]);

  const buildCommand = input.buildCommand ?? defaultBuildCommand(language, framework, pm) ?? null;
  const startCommand =
    input.startCommand ?? defaultStartCommand(language, framework, pm, port, workdir);

  const plan: Plan = {
    language,
    framework,
    pm,
    variant,
    version,
    workdir,
    port,
    buildCommand,
    startCommand,
    multiStage,
    nonRootUser,
    healthcheck,
    hasDockerignore,
    warn,
  };

  // ── know-how warnings (§7). Order is fixed so the output is deterministic.
  if (
    variant === "alpine" &&
    (language === "node" || language === "python" || language === "ruby")
  ) {
    warn(
      "Alpine uses musl libc: native addons and manylinux wheels often need a source rebuild. Use the slim (glibc) variant unless image size is the binding constraint.",
    );
  }
  if (input.languageVersion === undefined) {
    warn(
      `Base image tag \`${version}\` is this generator's default, pinned ${DEFAULT_VERSION_PINNED}. Check it is still a supported ${language} release before shipping, or pass an explicit version.`,
    );
  }
  if (!multiStage) {
    warn(
      "Single stage ships the build toolchain and dev dependencies into the runtime image — larger image, larger attack surface.",
    );
  }
  if (!nonRootUser) {
    warn("The container runs as root. A dedicated non-root user is the expected baseline.");
  }
  if (!hasDockerignore) {
    warn(
      "Without a .dockerignore, `COPY . .` copies .git and .env into the image — history and secrets end up in a layer.",
    );
  }
  if (/127\.0\.0\.1|localhost/.test(startCommand)) {
    warn(
      "The start command binds to localhost, so the port is unreachable from outside the container. Bind 0.0.0.0.",
    );
  }
  if (/\bflask\s+run\b/.test(startCommand)) {
    warn(
      "`flask run` is the development server. Serve production traffic through gunicorn/uvicorn.",
    );
  }
  if (framework === "next") {
    warn('Next.js: set `output: "standalone"` in next.config so the copied server bundle exists.');
  }
  if (framework === "django") {
    warn(
      "Replace `myproject.wsgi` with your project module, and wire collectstatic when settings allow it.",
    );
  }
  if (framework === "rails") {
    warn("`SECRET_KEY_BASE_DUMMY=1` for asset precompile requires Rails 7.1 or newer.");
  }
  if (language === "java") {
    warn(
      "The jar glob assumes the build produces exactly one jar; pin the filename if your build emits several.",
    );
  }
  if (language === "go") {
    warn(
      "CGO_ENABLED=0 produces a static binary. If you need cgo, drop it and run on a glibc runtime base.",
    );
  }
  if (language === "rust") {
    warn("Set BIN_NAME to your Cargo binary target if it is not `app`.");
  }
  if (pm === "poetry" || pm === "uv") {
    warn(`Pin the ${pm} version in the install line so the build stays reproducible.`);
  }

  // ── body
  let body: string[];
  if (language === "node") body = nodeBody(plan);
  else if (language === "python") body = pythonBody(plan);
  else if (language === "go") body = goBody(plan);
  else if (language === "java") body = javaBody(plan);
  else if (language === "ruby") body = rubyBody(plan);
  else body = rustBody(plan);

  // ── static-site tail is entirely different from a server tail
  const listenPort = staticSite ? (nonRootUser ? 8080 : 80) : port;
  if (staticSite) {
    if (input.port !== undefined && input.port !== listenPort) {
      warn(
        `A static build is served by nginx on port ${listenPort}; change the nginx config to move it, not the port field.`,
      );
    }
    body.push(
      "",
      "# EXPOSE documents the port. Publish it at run time with `-p`.",
      `EXPOSE ${listenPort}`,
      'CMD ["nginx","-g","daemon off;"]',
      "",
    );
  } else {
    // Every runtime base this generator emits is alpine-based exactly when the
    // alpine variant was picked, so useradd-vs-adduser follows the variant.
    const distro: Distro = variant === "alpine" ? "alpine" : "debian";
    const user = userPlan(language, pm, distro);
    const tail: string[] = [""];
    if (nonRootUser) {
      if (user.builtin) {
        tail.push("# The official node image already ships a non-root `node` account.");
      } else if (user.createLine) {
        tail.push(user.createLine);
      }
      if (!user.builtin) tail.push(`RUN chown -R ${user.name}:${user.group} ${workdir}`);
      tail.push(`USER ${user.name}`);
    }
    tail.push(
      "# EXPOSE documents the port. Publish it at run time with `-p`.",
      `EXPOSE ${listenPort}`,
    );
    if (healthcheck) {
      const hc = healthcheckLine(plan);
      if (hc) tail.push(hc);
    }
    const keyword: "CMD" | "ENTRYPOINT" =
      language === "go" || language === "rust" || language === "java" ? "ENTRYPOINT" : "CMD";
    tail.push(processCommand(keyword, startCommand, warn), "");
    body = body.concat(tail);
  }

  const header = [
    "# syntax=docker/dockerfile:1",
    "# Generated by Nebutra Forge · dockerfile-starter. Review before shipping.",
    `# Target: ${language}${framework === "none" ? "" : ` / ${framework}`} · ${pm} · ${variant} base`,
    "",
  ];

  const dockerfile = `${[...header, ...body]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;

  const stages = (dockerfile.match(/^FROM /gm) ?? []).length;

  return {
    dockerfile,
    dockerignore: hasDockerignore ? buildDockerignore(language) : null,
    dockerCompose: (input.includeCompose ?? false) ? buildCompose(plan, listenPort) : null,
    warnings,
    meta: {
      language,
      framework,
      packageManager: pm,
      baseVariant: variant,
      languageVersion: version,
      workdir,
      listenPort,
      buildCommand,
      startCommand: staticSite ? "nginx -g daemon off;" : startCommand,
      multiStage,
      nonRootUser,
      stages,
    },
  };
}

/* ── tool definition ───────────────────────────────────────────────────── */

const inputSchema = z
  .object({
    language: z.enum(LANGUAGES).describe("Runtime language of the application."),
    framework: z
      .enum(FRAMEWORKS)
      .default("none")
      .describe("Framework preset; must belong to the chosen language."),
    packageManager: z
      .enum(PACKAGE_MANAGERS)
      .default("auto")
      .describe("Dependency manager; `auto` picks the language default."),
    baseVariant: z
      .enum(BASE_VARIANTS)
      .default("slim")
      .describe(
        "Base image variant. `slim` is glibc; `alpine` is musl and can break native builds.",
      ),
    languageVersion: z
      .string()
      .regex(VERSION_RE, "version may only contain letters, digits, dot, dash and underscore")
      .optional()
      .describe("Runtime version tag, e.g. `22` or `3.12`. Defaults per language."),
    workdir: z
      .string()
      .regex(WORKDIR_RE, "workdir must be an absolute POSIX path")
      .default("/app")
      .describe("Absolute working directory inside the image."),
    port: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .optional()
      .describe("Port the app listens on. Defaults per framework."),
    buildCommand: commandField.optional().describe("Overrides the build/compile step."),
    startCommand: commandField
      .optional()
      .describe("Overrides the container entry command. Must bind 0.0.0.0, not localhost."),
    multiStage: z.boolean().default(true).describe("Separate build and runtime stages."),
    nonRootUser: z.boolean().default(true).describe("Run the final stage as a non-root user."),
    includeDockerignore: z.boolean().default(true).describe("Also emit a matching .dockerignore."),
    includeCompose: z.boolean().default(false).describe("Also emit a Compose Spec service file."),
    includeHealthcheck: z
      .boolean()
      .default(false)
      .describe("Add a HEALTHCHECK instruction (probe binary must exist in the base image)."),
  })
  .superRefine((value, ctx) => {
    const allowedFrameworks = FRAMEWORKS_BY_LANGUAGE[value.language];
    if (value.framework && !allowedFrameworks.includes(value.framework)) {
      ctx.addIssue({
        code: "custom",
        path: ["framework"],
        message: `framework "${value.framework}" is not available for ${value.language} (allowed: ${allowedFrameworks.join(", ")})`,
      });
    }
    const allowedPms = PMS_BY_LANGUAGE[value.language];
    if (
      value.packageManager &&
      value.packageManager !== "auto" &&
      !allowedPms.includes(value.packageManager)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["packageManager"],
        message: `packageManager "${value.packageManager}" is not available for ${value.language} (allowed: auto, ${allowedPms.join(", ")})`,
      });
    }
  });

export const dockerfileStarterTool = tool({
  id: "dev/dockerfile-starter",
  slug: "dockerfile-starter",
  category: "dev",
  title: { zh: "Dockerfile 生成器", en: "Dockerfile Starter" },
  description: {
    zh: "按语言/框架生成多阶段、非 root 的 Dockerfile，附 .dockerignore 与 compose；无需本地安装 Docker",
    en: "Framework-aware multi-stage, non-root Dockerfile with matching .dockerignore and Compose file — no local Docker install",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.dev.dockerfile_starter",
  roots: ["template", "generator"],
  engine: {
    name: "dockerfile-starter",
    upstream: "Dockerfile reference (syntax=docker/dockerfile:1) + BuildKit RUN --mount=type=cache",
    version: `dockerfile syntax 1 · default runtime tags pinned ${DEFAULT_VERSION_PINNED}`,
  },
  seoKeywords: {
    zh: "dockerfile生成器,在线生成dockerfile,多阶段构建模板,docker init 替代",
    en: "dockerfile generator, generate dockerfile online, multi-stage dockerfile template, docker init alternative",
  },
  inputSchema,
  execute: (input: DockerfileStarterInput) => generateDockerfileStarter(input),
});

export const w3DockerfileStarterTools: readonly AnyForgeToolDefinition[] = [dockerfileStarterTool];
