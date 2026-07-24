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
//   $DEPLOY_ROOT/sailor-docs/current/apps/sailor-docs/server.js  (Next standalone)
//   $DEPLOY_ROOT/router/current/apps/router/server.js            (Next standalone)
//   $DEPLOY_ROOT/forge/current/apps/forge/server.js              (Next standalone)
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
      name: "design-docs",
      cwd: "/var/www/nebutra/design-docs/current",
      script: "apps/design-docs/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3004,
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
      name: "api-gateway",
      // start.sh sources /var/www/nebutra/api/.env then `exec node dist/node.js`.
      // Plain `node dist/node.js` from PM2 does not load that env file, so DB/cache
      // probes fail (DATABASE_URL missing or mis-parsed). Packaging still strips
      // the tsx emergency loader — start.sh must stay on node, never tsx.
      cwd: "/var/www/nebutra/api",
      script: "start.sh",
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        HOSTNAME: "127.0.0.1",
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
      },
      max_memory_restart: "450M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      kill_timeout: 8000,
      listen_timeout: 10000,
    },
  ],
};
