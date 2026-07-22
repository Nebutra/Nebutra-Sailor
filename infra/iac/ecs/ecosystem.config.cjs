// PM2 ecosystem for SSH-managed Cloud VM deployments shipped via
// .github/workflows/deploy-ecs.yml.
//
// Layout assumption (set by infra/scripts/ecs-deploy-remote.sh):
//   $DEPLOY_ROOT/landing/current/apps/landing-page/server.js     (Next standalone)
//   $DEPLOY_ROOT/web/current/apps/web/server.js                  (Next standalone)
//   $DEPLOY_ROOT/api/current/dist/node.js                        (pnpm-deploy + tsc)
//   $DEPLOY_ROOT/idp/current/apps/idp/server.js                  (Next standalone)
//   $DEPLOY_ROOT/auth/current/apps/auth/server.js                (Next standalone login center)
//   $DEPLOY_ROOT/design-docs/current/apps/design-docs/server.js  (Next standalone)
//   $DEPLOY_ROOT/sailor-docs/current/apps/sailor-docs/server.js  (Next standalone)
//
// The workflow renders this file on the VM with DEPLOY_ROOT substituted in
// via envsubst at apply time (see ecs-deploy-remote.sh).
module.exports = {
  apps: [
    {
      name: "landing-page",
      cwd: "/var/www/nebutra/landing/current",
      script: "apps/landing-page/server.js",
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
      name: "auth-center",
      cwd: "/var/www/nebutra/auth/current",
      script: "apps/auth/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3101,
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
      name: "api-gateway",
      cwd: "/var/www/nebutra/api/current",
      // Production entry is plain Node. Workspace packages that still advertise
      // ./src/*.ts for monorepo DX are compiled + rewritten by
      // scripts/prepare-pnpm-deploy-node-runtime.mjs during the api build job.
      script: "dist/node.js",
      interpreter: "node",
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
  ],
};
