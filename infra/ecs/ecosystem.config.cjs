// PM2 ecosystem for ECS Lite deployments shipped via .github/workflows/deploy-ecs.yml.
//
// Layout assumption (set by infra/scripts/ecs-deploy-remote.sh):
//   $DEPLOY_ROOT/landing/current/apps/landing-page/server.js   (Next standalone)
//   $DEPLOY_ROOT/web/current/apps/web/server.js                (Next standalone)
//   $DEPLOY_ROOT/api/current/dist/index.js                     (pnpm-deploy + tsc)
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
      name: "api-gateway",
      cwd: "/var/www/nebutra/api/current",
      script: "dist/index.js",
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
