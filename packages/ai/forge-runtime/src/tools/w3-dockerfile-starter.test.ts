/**
 * Tests for the dockerfile-starter engine.
 *
 * The brief (docs/plans/tools/dockerfile-starter.md §7) names eight domain
 * rules and treats the first three as "the bar `docker init` already clears",
 * so those get assertions too — regressing below them would make this tool
 * strictly worse than a command most developers already have.
 */
import { describe, expect, it } from "vitest";
import {
  dockerfileStarterTool,
  generateDockerfileStarter,
  tokenizeCommand,
  w3DockerfileStarterTools,
} from "./w3-dockerfile-starter";

type Input = Parameters<typeof generateDockerfileStarter>[0];

function gen(input: Input) {
  return generateDockerfileStarter(input);
}

/** Line index of the first line matching `re`, or -1. */
function lineOf(text: string, re: RegExp): number {
  return text.split("\n").findIndex((l) => re.test(l));
}

function parse(input: unknown) {
  return dockerfileStarterTool.inputSchema.safeParse(input);
}

describe("descriptor", () => {
  it("is declared pure, core, metered and rooted in the template drawer", () => {
    expect(dockerfileStarterTool.id).toBe("dev/dockerfile-starter");
    expect(dockerfileStarterTool.slug).toBe("dockerfile-starter");
    expect(dockerfileStarterTool.sideEffect).toBe("pure");
    expect(dockerfileStarterTool.tier).toBe("core");
    expect(dockerfileStarterTool.meterId).toBe("forge.dev.dockerfile_starter");
    expect(dockerfileStarterTool.roots).toContain("template");
    expect(dockerfileStarterTool.engine.upstream).toMatch(/dockerfile/i);
    expect(w3DockerfileStarterTools).toContain(dockerfileStarterTool);
  });

  it("is deterministic — the same input yields byte-identical output", () => {
    const input: Input = { language: "node", framework: "next", includeCompose: true };
    expect(gen(input)).toEqual(gen(input));
  });

  it("runs through the registry contract with defaults applied", async () => {
    const parsed = parse({ language: "python", framework: "fastapi" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const out = (await dockerfileStarterTool.execute(parsed.data)) as ReturnType<typeof gen>;
    expect(out.meta.multiStage).toBe(true);
    expect(out.meta.nonRootUser).toBe(true);
    expect(out.dockerignore).not.toBeNull();
    expect(out.dockerCompose).toBeNull();
  });
});

describe("schema", () => {
  it("requires a language", () => {
    expect(parse({}).success).toBe(false);
  });

  it("rejects a framework that does not belong to the language", () => {
    const r = parse({ language: "python", framework: "next" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/not available for python/);
  });

  it("accepts a framework that does belong to the language", () => {
    expect(parse({ language: "python", framework: "django" }).success).toBe(true);
  });

  it("rejects a package manager from another ecosystem", () => {
    const r = parse({ language: "go", packageManager: "npm" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/not available for go/);
  });

  it("rejects a relative workdir", () => {
    expect(parse({ language: "node", workdir: "app" }).success).toBe(false);
    expect(parse({ language: "node", workdir: "/srv/app" }).success).toBe(true);
  });

  it("rejects a port outside 1..65535", () => {
    expect(parse({ language: "node", port: 0 }).success).toBe(false);
    expect(parse({ language: "node", port: 70000 }).success).toBe(false);
    expect(parse({ language: "node", port: 8080 }).success).toBe(true);
  });

  it("rejects a version tag that could break out of the FROM line", () => {
    expect(parse({ language: "node", languageVersion: "22 AS evil" }).success).toBe(false);
    expect(parse({ language: "node", languageVersion: "22-bookworm" }).success).toBe(true);
  });

  it("rejects a newline in a command — it would inject a Dockerfile instruction", () => {
    const r = parse({ language: "node", startCommand: "node app.js\nUSER root" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/single line/);
  });

  it("applies the documented defaults", () => {
    const r = parse({ language: "node" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toMatchObject({
      framework: "none",
      packageManager: "auto",
      baseVariant: "slim",
      workdir: "/app",
      multiStage: true,
      nonRootUser: true,
      includeDockerignore: true,
      includeCompose: false,
      includeHealthcheck: false,
    });
  });
});

/* ── §7 point 1 — dependency manifests before source ────────────────────── */

describe("know-how 1: layer order", () => {
  it("copies the manifest and installs before copying the source (node)", () => {
    const { dockerfile } = gen({ language: "node", framework: "nest" });
    const manifest = lineOf(dockerfile, /^COPY package\.json package-lock\.json \.\/$/);
    const install = lineOf(dockerfile, /npm ci$/);
    const source = lineOf(dockerfile, /^COPY \. \.$/);
    expect(manifest).toBeGreaterThan(-1);
    expect(install).toBeGreaterThan(manifest);
    expect(source).toBeGreaterThan(install);
  });

  it("uses the lockfile that matches the selected package manager", () => {
    expect(gen({ language: "node", packageManager: "pnpm" }).dockerfile).toContain(
      "COPY package.json pnpm-lock.yaml ./",
    );
    expect(gen({ language: "node", packageManager: "yarn" }).dockerfile).toContain("yarn.lock");
    expect(gen({ language: "python", packageManager: "poetry" }).dockerfile).toContain(
      "COPY pyproject.toml poetry.lock ./",
    );
  });

  it("resolves go and java dependencies from the manifest alone", () => {
    const go = gen({ language: "go" }).dockerfile;
    expect(lineOf(go, /^COPY go\.mod go\.sum \.\/$/)).toBeLessThan(lineOf(go, /^COPY \. \.$/));
    const java = gen({ language: "java", framework: "spring-boot" }).dockerfile;
    expect(lineOf(java, /dependency:go-offline/)).toBeLessThan(lineOf(java, /^COPY src \.\/src$/));
  });
});

/* ── §7 point 2 — multi-stage separates build from run ──────────────────── */

describe("know-how 2: multi-stage", () => {
  it("emits separate build and runtime stages by default", () => {
    const out = gen({ language: "go" });
    expect(out.meta.stages).toBeGreaterThan(1);
    expect(out.dockerfile).toMatch(/AS build/);
    expect(out.dockerfile).toMatch(/AS runtime/);
    expect(out.dockerfile).toMatch(/COPY --from=build/);
    // The compiler image must not be the runtime image.
    expect(out.dockerfile).toContain("FROM debian:bookworm-slim AS runtime");
  });

  it("installs production dependencies only in the node runtime stage", () => {
    const { dockerfile } = gen({ language: "node", framework: "nest" });
    expect(dockerfile).toContain("npm ci --omit=dev");
    // NODE_ENV must not be set before the build stage, or the build loses its
    // devDependencies and fails.
    expect(lineOf(dockerfile, /^ENV NODE_ENV=production$/)).toBeGreaterThan(
      lineOf(dockerfile, /^RUN npm run build$/),
    );
  });

  it("degrades to a single stage on request, and says what that costs", () => {
    const out = gen({ language: "go", multiStage: false });
    expect(out.meta.stages).toBe(1);
    expect(out.dockerfile).not.toContain("COPY --from=");
    expect(out.warnings.join(" ")).toMatch(/Single stage ships the build toolchain/);
  });
});

/* ── §7 point 3 — never run as root ─────────────────────────────────────── */

describe("know-how 3: non-root final user", () => {
  it("uses the account the official node image already ships", () => {
    const { dockerfile } = gen({ language: "node", framework: "express" });
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).not.toMatch(/useradd|adduser/);
    expect(dockerfile).toContain("COPY --chown=node:node . .");
  });

  it("creates a system user with the tooling the base distro actually has", () => {
    expect(gen({ language: "python" }).dockerfile).toContain("RUN groupadd --system");
    expect(gen({ language: "python", baseVariant: "alpine" }).dockerfile).toContain(
      "RUN addgroup -S app && adduser -S -G app app",
    );
  });

  it("puts USER after the copies so the app directory is already owned", () => {
    const { dockerfile } = gen({ language: "python", framework: "flask" });
    expect(lineOf(dockerfile, /^USER app$/)).toBeGreaterThan(lineOf(dockerfile, /^RUN chown -R /));
    expect(lineOf(dockerfile, /^RUN chown -R /)).toBeGreaterThan(
      lineOf(dockerfile, /^COPY \. \.$/),
    );
  });

  it("warns loudly when the caller turns it off", () => {
    const out = gen({ language: "python", nonRootUser: false });
    expect(out.dockerfile).not.toContain("USER ");
    expect(out.warnings.join(" ")).toMatch(/runs as root/);
  });
});

/* ── §7 point 4 — base image tag is a documented choice ─────────────────── */

describe("know-how 4: base image variant", () => {
  it("defaults to the glibc slim variant, not alpine", () => {
    expect(gen({ language: "node" }).dockerfile).toContain(
      "FROM node:${NODE_VERSION}-slim AS base",
    );
    expect(gen({ language: "python" }).dockerfile).toContain("python:${PYTHON_VERSION}-slim");
    expect(gen({ language: "node" }).warnings.join(" ")).not.toMatch(/musl/);
  });

  it("states the musl tradeoff when alpine is chosen", () => {
    const out = gen({ language: "node", baseVariant: "alpine" });
    expect(out.dockerfile).toContain("node:${NODE_VERSION}-alpine");
    expect(out.warnings.join(" ")).toMatch(/musl libc/);
  });

  it("honours an explicit runtime version and defaults per language", () => {
    expect(gen({ language: "node", languageVersion: "20" }).dockerfile).toContain(
      "ARG NODE_VERSION=20",
    );
    expect(gen({ language: "python" }).meta.languageVersion).toBe("3.12");
    // Bun is versioned independently of Node's release line.
    expect(gen({ language: "node", packageManager: "bun" }).dockerfile).toContain(
      "FROM oven/bun:${NODE_VERSION} AS base",
    );
  });
});

/* ── §7 point 5 — .dockerignore is part of the answer ───────────────────── */

describe("know-how 5: .dockerignore", () => {
  it("emits one by default, excluding VCS history and secrets", () => {
    const out = gen({ language: "node" });
    expect(out.dockerignore).not.toBeNull();
    const ignore = out.dockerignore ?? "";
    for (const entry of [".git", ".env", "node_modules", "*.pem"]) {
      expect(ignore.split("\n")).toContain(entry);
    }
  });

  it("is language-aware", () => {
    expect(gen({ language: "python" }).dockerignore).toContain("__pycache__/");
    expect(gen({ language: "rust" }).dockerignore).toContain("target");
    expect(gen({ language: "python" }).dockerignore).not.toContain("node_modules");
  });

  it("warns about what `COPY . .` then drags in when it is turned off", () => {
    const out = gen({ language: "node", includeDockerignore: false });
    expect(out.dockerignore).toBeNull();
    expect(out.warnings.join(" ")).toMatch(/copies \.git and \.env/);
  });
});

/* ── §7 point 6 — framework output paths, the differentiator ────────────── */

describe("know-how 6: framework presets beyond the language default", () => {
  it("Next.js copies the standalone bundle and says what next.config must set", () => {
    const out = gen({ language: "node", framework: "next" });
    expect(out.dockerfile).toContain("/.next/standalone");
    expect(out.dockerfile).toContain("/.next/static");
    expect(out.dockerfile).toContain('CMD ["node","server.js"]');
    expect(out.warnings.join(" ")).toMatch(/output: "standalone"/);
  });

  it("NestJS runs the compiled dist entry, not the sources", () => {
    const out = gen({ language: "node", framework: "nest" });
    expect(out.dockerfile).toContain("COPY --chown=node:node --from=build /app/dist ./dist");
    expect(out.dockerfile).toContain('CMD ["node","dist/main.js"]');
  });

  it("a Vite build is served by a static server, not by node", () => {
    const out = gen({ language: "node", framework: "vite" });
    expect(out.dockerfile).toContain("FROM nginxinc/nginx-unprivileged:alpine AS runtime");
    expect(out.dockerfile).toContain("/usr/share/nginx/html");
    // The unprivileged image binds 8080; the privileged one binds 80.
    expect(out.meta.listenPort).toBe(8080);
    expect(gen({ language: "node", framework: "vite", nonRootUser: false }).meta.listenPort).toBe(
      80,
    );
  });

  it("keeps multi-stage on for a static site even when asked for one stage", () => {
    const out = gen({ language: "node", framework: "vite", multiStage: false });
    expect(out.meta.multiStage).toBe(true);
    expect(out.warnings.join(" ")).toMatch(/built by Node and served by nginx/);
  });

  it("python frameworks get their real production servers, not the dev server", () => {
    expect(gen({ language: "python", framework: "fastapi" }).meta.startCommand).toBe(
      "uvicorn app.main:app --host 0.0.0.0 --port 8000",
    );
    expect(gen({ language: "python", framework: "flask" }).meta.startCommand).toMatch(/^gunicorn /);
    expect(gen({ language: "python", framework: "django" }).meta.startCommand).toMatch(
      /wsgi:application$/,
    );
  });

  it("Spring Boot ships a jre runtime and a container-aware heap", () => {
    const out = gen({ language: "java", framework: "spring-boot" });
    expect(out.dockerfile).toContain("FROM eclipse-temurin:${JAVA_VERSION}-jre AS runtime");
    expect(out.dockerfile).toContain("MaxRAMPercentage");
    expect(out.warnings.join(" ")).toMatch(/jar glob/);
  });

  it("gradle builds the boot jar from build/libs", () => {
    const out = gen({ language: "java", framework: "spring-boot", packageManager: "gradle" });
    expect(out.dockerfile).toContain("bootJar");
    expect(out.dockerfile).toContain("/build/build/libs/*.jar");
  });

  it("Rails precompiles assets in the build stage and drops the toolchain", () => {
    const out = gen({ language: "ruby", framework: "rails" });
    expect(out.dockerfile).toContain("assets:precompile");
    expect(out.dockerfile).toContain("build-essential");
    // The toolchain install belongs to the build stage only.
    expect(lineOf(out.dockerfile, /build-essential/)).toBeLessThan(
      lineOf(out.dockerfile, /^FROM base AS runtime$/),
    );
  });

  it("ports default per framework and follow an explicit override", () => {
    expect(gen({ language: "python", framework: "fastapi" }).meta.listenPort).toBe(8000);
    expect(gen({ language: "ruby", framework: "sinatra" }).meta.listenPort).toBe(4567);
    const custom = gen({ language: "python", framework: "fastapi", port: 9100 });
    expect(custom.meta.listenPort).toBe(9100);
    expect(custom.dockerfile).toContain("EXPOSE 9100");
    expect(custom.meta.startCommand).toContain("--port 9100");
  });
});

/* ── §7 point 7 — signals, exec form, healthcheck ───────────────────────── */

describe("know-how 7: exec form and signal handling", () => {
  it("emits exec form so SIGTERM reaches the process", () => {
    expect(gen({ language: "python", framework: "fastapi" }).dockerfile).toContain(
      'CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]',
    );
  });

  it("wraps a command that genuinely needs a shell in `sh -c exec …`", () => {
    const out = gen({ language: "python", startCommand: "python main.py && echo done" });
    expect(out.dockerfile).toContain('CMD ["/bin/sh","-c","exec python main.py && echo done"]');
    expect(out.warnings.join(" ")).toMatch(/keeps the app as PID 1/);
  });

  it("tokenizes quoted arguments instead of splitting inside them", () => {
    expect(tokenizeCommand('node --title "my app" server.js')).toEqual([
      "node",
      "--title",
      "my app",
      "server.js",
    ]);
    expect(tokenizeCommand("")).toBeNull();
    expect(tokenizeCommand('node "unbalanced')).toBeNull();
  });

  it("uses ENTRYPOINT for compiled binaries and CMD for interpreted starts", () => {
    expect(gen({ language: "go" }).dockerfile).toContain('ENTRYPOINT ["/app/app"]');
    expect(gen({ language: "node" }).dockerfile).toMatch(/^CMD /m);
  });

  it("adds a HEALTHCHECK only on request, with a probe the base image can run", () => {
    expect(gen({ language: "node" }).dockerfile).not.toContain("HEALTHCHECK");
    const node = gen({ language: "node", includeHealthcheck: true });
    // Node 18+ ships fetch — no curl/wget needs installing.
    expect(node.dockerfile).toContain("HEALTHCHECK");
    expect(node.dockerfile).toContain('"node","-e"');
    const go = gen({ language: "go", includeHealthcheck: true });
    expect(go.dockerfile).toContain("wget");
    expect(go.warnings.join(" ")).toMatch(/wget, which is present in alpine/);
  });
});

/* ── §7 point 8 — EXPOSE documents, it does not publish ─────────────────── */

describe("know-how 8: EXPOSE is documentation", () => {
  it("says so next to the instruction", () => {
    const { dockerfile } = gen({ language: "go" });
    const i = lineOf(dockerfile, /^EXPOSE 8080$/);
    expect(dockerfile.split("\n")[i - 1]).toMatch(/documents the port/);
  });

  it("puts the actual publish in the compose file, and omits the obsolete version key", () => {
    const out = gen({ language: "node", framework: "express", includeCompose: true });
    const compose = out.dockerCompose ?? "";
    expect(compose).toContain('- "3000:3000"');
    expect(compose).not.toMatch(/^version:/m);
    expect(compose).toContain("NODE_ENV=production");
  });

  it("omits compose unless asked", () => {
    expect(gen({ language: "node" }).dockerCompose).toBeNull();
  });
});

/* ── binding + injection safety ─────────────────────────────────────────── */

describe("runtime reachability and safety", () => {
  it("flags a start command bound to localhost", () => {
    const out = gen({ language: "python", startCommand: "uvicorn app:app --host 127.0.0.1" });
    expect(out.warnings.join(" ")).toMatch(/unreachable from outside the container/);
  });

  it("flags the flask development server", () => {
    const out = gen({
      language: "python",
      framework: "flask",
      startCommand: "flask run --host 0.0.0.0",
    });
    expect(out.warnings.join(" ")).toMatch(/development server/);
  });

  it("never emits a bare EXPOSE without a port or an empty CMD", () => {
    for (const language of ["node", "python", "go", "java", "ruby", "rust"] as const) {
      const { dockerfile } = gen({ language });
      expect(dockerfile).toMatch(/^EXPOSE \d+$/m);
      expect(dockerfile).toMatch(/^(CMD|ENTRYPOINT) \[".+"\]$/m);
      expect(dockerfile.startsWith("# syntax=docker/dockerfile:1\n")).toBe(true);
      expect(dockerfile.endsWith("\n")).toBe(true);
    }
  });

  it("keeps a custom workdir consistent across stages", () => {
    const out = gen({ language: "java", workdir: "/srv/app" });
    expect(out.dockerfile).toContain("WORKDIR /srv/app");
    expect(out.dockerfile).toContain("/srv/app/app.jar");
    expect(out.dockerfile).not.toContain("WORKDIR /app\n");
  });

  it("puts the built artifact where the start command looks for it, in every shape", () => {
    // A single stage is not an excuse to emit an image that builds and then
    // dies: cargo leaves the binary under target/release, maven/gradle leave
    // the jar under target//build/libs, and the ENTRYPOINT points at neither.
    const rust = gen({ language: "rust", multiStage: false }).dockerfile;
    expect(rust).toMatch(/^ENTRYPOINT \["\/app\/app"\]$/m);
    expect(rust).toContain("RUN cp target/release/${BIN_NAME} /app/app");

    const maven = gen({ language: "java", framework: "spring-boot", multiStage: false }).dockerfile;
    expect(maven).toContain("/app/app.jar");
    expect(maven).toContain("RUN cp target/*.jar /app/app.jar");

    const gradle = gen({
      language: "java",
      packageManager: "gradle",
      multiStage: false,
    }).dockerfile;
    expect(gradle).toContain("RUN cp build/libs/*.jar /app/app.jar");
  });

  it("builds against the same libc the runtime image ships", () => {
    // A Debian-built Rust binary in an `alpine:` runtime does not start at all.
    const alpine = gen({ language: "rust", baseVariant: "alpine" }).dockerfile;
    expect(alpine).toContain("FROM rust:${RUST_VERSION}-alpine AS build");
    expect(alpine).toContain("FROM alpine:");
    expect(alpine).not.toContain("rust:${RUST_VERSION}-slim");

    const slim = gen({ language: "rust" }).dockerfile;
    expect(slim).toContain("FROM rust:${RUST_VERSION}-slim AS build");
    expect(slim).toContain("FROM debian:");
  });

  it("never chowns to an account the image does not have yet", () => {
    // `COPY --chown=app:app` is resolved against the image's /etc/passwd at
    // build time. The `app` user is created in the tail, so a --chown before
    // that line fails the build; only node's built-in account is safe.
    for (const packageManager of ["npm", "pnpm", "yarn", "bun"] as const) {
      const { dockerfile } = gen({ language: "node", packageManager });
      const copies = dockerfile.split("\n").filter((l) => l.startsWith("COPY --chown="));
      for (const line of copies) {
        expect(line).toContain("--chown=node:node");
      }
      if (packageManager === "bun") {
        expect(copies).toEqual([]);
        expect(dockerfile).toContain("RUN chown -R app:app /app");
      }
    }
  });

  it("copies a bun lockfile under a name bun still writes", () => {
    // Bun 1.2 replaced bun.lockb with bun.lock; a COPY naming only the old file
    // fails on every project created since.
    const { dockerfile } = gen({ language: "node", packageManager: "bun" });
    expect(dockerfile).toContain("COPY package.json bun.lock* ./");
    expect(dockerfile).not.toContain("bun.lockb ");
  });

  it("says when a base image tag is a default that may have aged out", () => {
    const defaulted = gen({ language: "go" });
    expect(defaulted.warnings.join(" ")).toMatch(/pinned \d{4}-\d{2}/);
    const explicit = gen({ language: "go", languageVersion: "1.24" });
    expect(explicit.warnings.join(" ")).not.toMatch(/pinned \d{4}-\d{2}/);
    expect(explicit.dockerfile).toContain("ARG GO_VERSION=1.24");
  });
});
