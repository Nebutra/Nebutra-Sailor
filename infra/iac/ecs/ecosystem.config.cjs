// PM2 ecosystem for SSH-managed Cloud VM deployments shipped via
// .github/workflows/deploy-ecs.yml.
//
// Layout assumption (set by infra/scripts/ecs-deploy-remote.sh):
//   $DEPLOY_ROOT/landing/current/apps/landing/server.js     (Next standalone)
//   $DEPLOY_ROOT/web/current/apps/web/server.js                  (Next standalone)
//   $DEPLOY_ROOT/api/current/dist/node.js                        (pnpm-deploy + tsc)
//   $DEPLOY_ROOT/idp/current/apps/idp/server.js                  (Next standalone)
//   $DEPLOY_ROOT/auth/current/apps/auth/server.js                (Next standalone login center)
//   $DEPLOY_ROOT/design-docs/current/apps/design-docs/server.js  (Next standalone)
//   $DEPLOY_ROOT/pebble/current/apps/pebble/server.js            (Next standalone brand front)
//   $DEPLOY_ROOT/sailor-docs/current/apps/sailor-docs/server.js  (Next standalone)
//   $DEPLOY_ROOT/router/current/apps/router/server.js            (Next standalone)
//   $DEPLOY_ROOT/forge/current/apps/forge/server.js              (Next standalone)
//   $DEPLOY_ROOT/admin/current/apps/admin/server.js              (Next standalone control plane)
//
// The workflow renders this file on the VM with DEPLOY_ROOT substituted in
// via envsubst at apply time (see ecs-deploy-remote.sh).
module.exports = {
  apps: [
    {
      name: "landing",
      cwd: "/var/www/nebutra/landing/current",
      script: "apps/landing/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "350M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      name: "web",
      cwd: "/var/www/nebutra/web/current",
      script: "apps/web/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "450M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      // Serves design.nebutra.com. Renders the real @nebutra/ui against the
      // real token source, so a token that breaks a component breaks the page —
      // which is the point of it. Replaced design-docs at that hostname.
      name: "design",
      cwd: "/var/www/nebutra/design/current",
      script: "apps/design/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3109,
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "400M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      // Pebble brand front — marketing / download / whats-new feeds.
      // Fronted by nginx conf.d/pebble.nebutra.com.conf (A → ECS, CF proxied).
      name: "pebble",
      cwd: "/var/www/nebutra/pebble/current",
      script: "apps/pebble/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3017,
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "300M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      name: "sailor-docs",
      cwd: "/var/www/nebutra/sailor-docs/current",
      script: "apps/sailor-docs/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3005,
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "400M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      name: "idp",
      cwd: "/var/www/nebutra/idp/current",
      script: "apps/idp/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3100,
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "450M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      // Source /var/www/nebutra/auth/.env so magic/passkey/turnstile flags and
      // OAuth secrets stay live across restarts (plain node skips the file).
      name: "auth-center",
      cwd: "/var/www/nebutra/auth/current",
      script: "/var/www/nebutra/node-with-env.sh",
      interpreter: "bash",
      args: "apps/auth/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3101,
        HOSTNAME: "127.0.0.1",
        ENV_FILE: "/var/www/nebutra/auth/.env",
      },
      max_memory_restart: "450M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      // Carina Track-B kernel — same host as api-gateway (local-first co-deploy).
      // Install binaries: infra/ops/scripts/install-carina-daemon.sh
      //   (carina-daemon + carina-kernel-service; docker fallback when glibc is old)
      // Socket: /var/carina/run/daemon.sock → CARINA_DAEMON_SOCK on api-gateway.
      name: "carina-daemon",
      cwd: "/var/carina",
      script: "/var/carina/bin/carina-daemon",
      args: "-socket /var/carina/run/daemon.sock -state /var/carina/state -kernel /var/carina/bin/carina-kernel-service -tools /var/carina/bin -approval-mode always-approve",
      interpreter: "none",
      env: {
        HOME: "/var/carina/home",
        CARINA_HOME: "/var/carina",
        CARINA_KERNEL_BIN: "/var/carina/bin/carina-kernel-service",
      },
      max_memory_restart: "512M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 20,
      kill_timeout: 8000,
      listen_timeout: 15000,
    },
    {
      name: "api-gateway",
      // start.sh sources /var/www/nebutra/api/.env then `exec node dist/node.js`.
      // Plain `node dist/node.js` from PM2 does not load that env file, so DB/cache
      // probes fail (DATABASE_URL missing or mis-parsed). Packaging still strips
      // the tsx emergency loader — start.sh must stay on node, never tsx.
      // Carina co-deploy defaults (override via /var/www/nebutra/api/.env).
      cwd: "/var/www/nebutra/api",
      script: "start.sh",
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        HOSTNAME: "127.0.0.1",
        CARINA_CODEPLOY: "1",
        CARINA_DAEMON_SOCK: "/var/carina/run/daemon.sock",
        CARINA_WORKSPACE_ROOT: "/var/carina/ws",
      },
      // Gateway imports Prisma, provider SDKs, workers, and Hono route graphs
      // at startup. The real VM process settles near the old 300M limit,
      // causing PM2 memory restarts before nginx/Cloudflare smoke tests can
      // hit a stable listener.
      max_memory_restart: "700M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      name: "router",
      cwd: "/var/www/nebutra/router/current",
      script: "/var/www/nebutra/node-with-env.sh",
      interpreter: "bash",
      args: "apps/router/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3106,
        HOSTNAME: "127.0.0.1",
        ENV_FILE: "/var/www/nebutra/router/.env",
      },
      max_memory_restart: "450M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      // Internal ecosystem control plane. Staff-only, low traffic — sized well
      // below the product apps. Fronted by Cloudflare Access; nginx must not
      // expose it without that policy in place.
      name: "admin",
      cwd: "/var/www/nebutra/admin/current",
      script: "/var/www/nebutra/node-with-env.sh",
      interpreter: "bash",
      args: "apps/admin/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3108,
        HOSTNAME: "127.0.0.1",
        ENV_FILE: "/var/www/nebutra/admin/.env",
      },
      max_memory_restart: "350M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      name: "forge",
      cwd: "/var/www/nebutra/forge/current",
      script: "/var/www/nebutra/node-with-env.sh",
      interpreter: "bash",
      args: "apps/forge/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3105,
        HOSTNAME: "127.0.0.1",
        ENV_FILE: "/var/www/nebutra/forge/.env",
        // Free tools default: memory prepaid. Set FORGE_WALLET_MODE=ledger in
        // forge/.env only after CreditBalance / app_user is provisioned.
        FORGE_WALLET_MODE: "memory",
        FORGE_ALLOW_MEMORY_WALLET: "1",
        // Full Chromium for md-to-pdf (not headless_shell-only).
        PLAYWRIGHT_CHROMIUM_USE_HEADLESS_SHELL: "0",
        PLAYWRIGHT_BROWSERS_PATH: "/var/www/nebutra/.cache/ms-playwright",
        // Authoritative DNS leak control plane (localhost only).
        FORGE_DNS_LEAK_URL: "http://127.0.0.1:3953",
      },
      max_memory_restart: "450M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
    {
      // Authoritative leak zone (UDP/TCP 53) + localhost control API :3953.
      // Requires NS for leak.nebutra.com → ns1.leak.nebutra.com (DNS-only A).
      // Port 53: setcap cap_net_bind_service=+ep on node, or CAP in systemd.
      name: "forge-dns-leak",
      cwd: "/var/www/nebutra/forge/current",
      // Node 22+ strip-types — no tsx required in the forge standalone tree.
      script: "/var/www/nebutra/node-with-env.sh",
      interpreter: "bash",
      args: "--experimental-strip-types --no-warnings=ExperimentalWarning packages/ai/forge-dns-leak/src/cli.ts",
      env: {
        NODE_ENV: "production",
        ENV_FILE: "/var/www/nebutra/forge/.env",
        FORGE_DNS_LEAK_ZONE: "leak.nebutra.com",
        FORGE_DNS_LEAK_NS: "ns1.leak.nebutra.com",
        // Probe A rdata (harmless). NS host A uses FORGE_DNS_LEAK_NS_IP.
        FORGE_DNS_LEAK_ANSWER_IP: "127.0.0.1",
        FORGE_DNS_LEAK_NS_IP: "106.15.4.31",
        FORGE_DNS_LEAK_DNS_HOST: "0.0.0.0",
        // Prefer 5353 if setcap/root cannot bind 53; bootstrap may override to 53.
        FORGE_DNS_LEAK_DNS_PORT: "53",
        FORGE_DNS_LEAK_API_HOST: "127.0.0.1",
        FORGE_DNS_LEAK_API_PORT: "3953",
      },
      max_memory_restart: "120M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 20,
      kill_timeout: 4000,
      listen_timeout: 8000,
    },
  ],
};
