// PM2 ecosystem for ECS Lite deployments shipped via .github/workflows/deploy-ecs.yml.
//
// Layout assumption (set by infra/scripts/ecs-deploy-remote.sh):
//   $DEPLOY_ROOT/landing/current/apps/landing-page/server.js     (Next standalone)
//   $DEPLOY_ROOT/web/current/apps/web/server.js                  (Next standalone)
//   $DEPLOY_ROOT/api/current/dist/index.js                       (pnpm-deploy + tsc)
//   $DEPLOY_ROOT/design-docs/current/apps/design-docs/server.js  (Next standalone)
//
// The workflow renders this file on the ECS box with DEPLOY_ROOT substituted in
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
      name: "api-gateway",
      cwd: "/var/www/nebutra/api/current",
      // Workspace dependencies (e.g. @nebutra/alerting) publish .ts source
      // directly via package.json `main`/`exports`. Plain `node` ESM cannot
      // load .ts files. tsx as a Node loader compiles them on import. tsx is
      // a runtime dep of api-gateway so it ships in the production bundle.
      script: "dist/index.js",
      interpreter: "node",
      interpreter_args: "--import tsx/esm",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
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
  ],
};
