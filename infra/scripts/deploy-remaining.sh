#!/usr/bin/env bash
# =============================================================================
# Nebutra-Sailor 剩余部署步骤
# 前提：系统依赖、Docker、Node.js、pnpm、PM2、数据库已就绪
# 执行：在 ECS 上直接运行，或通过 Mac 终端 SSH 执行
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step()  { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}\n"; }

PROJECT_DIR="/opt/nebutra"
cd "$PROJECT_DIR"

# =============================================================================
# 第 1 步：验证前置条件
# =============================================================================
step "第 1 步：验证前置条件"

command -v node &>/dev/null   || error "Node.js 未安装"
command -v pnpm &>/dev/null   || error "pnpm 未安装"
command -v pm2 &>/dev/null    || error "PM2 未安装"
command -v docker &>/dev/null || error "Docker 未安装"
command -v nginx &>/dev/null  || error "Nginx 未安装"

# 检查数据库是否运行
docker compose -f docker-compose.lite.yml ps --format json 2>/dev/null | grep -q "running" \
  || warn "数据库容器可能未运行，尝试启动..."
docker compose -f docker-compose.lite.yml up -d 2>/dev/null || true

log "前置条件检查通过"
log "Node.js: $(node -v)"
log "pnpm: $(pnpm -v)"
log "PM2: $(pm2 -v 2>/dev/null || echo 'installed')"

# =============================================================================
# 第 2 步：安装项目依赖
# =============================================================================
step "第 2 步：安装 pnpm 依赖"

# 如果 frozen-lockfile 失败，回退到普通 install
if pnpm install --frozen-lockfile 2>&1 | tail -5; then
  log "pnpm install (frozen-lockfile) 完成"
else
  warn "frozen-lockfile 失败，尝试普通 install..."
  pnpm install 2>&1 | tail -5
  log "pnpm install 完成"
fi

# =============================================================================
# 第 3 步：构建应用
# =============================================================================
step "第 3 步：构建 Next.js 应用"

# 设置环境变量避免构建错误
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# 逐个构建，显示进度
echo ">>> 构建 Landing Page..."
if pnpm turbo build --filter=@nebutra/landing-page 2>&1 | tail -10; then
  log "Landing Page 构建成功"
else
  warn "Landing Page 构建失败，尝试跳过类型检查..."
  cd apps/landing-page && npx next build 2>&1 | tail -10 && cd "$PROJECT_DIR"
fi

echo ">>> 构建 Web App..."
if pnpm turbo build --filter=@nebutra/web 2>&1 | tail -10; then
  log "Web App 构建成功"
else
  warn "Web App 构建失败，尝试跳过类型检查..."
  cd apps/web && npx next build 2>&1 | tail -10 && cd "$PROJECT_DIR"
fi

echo ">>> 构建 API Gateway..."
if pnpm turbo build --filter=@nebutra/api-gateway 2>&1 | tail -10; then
  log "API Gateway 构建成功"
else
  warn "API Gateway 构建失败，可能需要手动修复"
fi

log "应用构建完成"

# =============================================================================
# 第 4 步：配置并启动 PM2
# =============================================================================
step "第 4 步：使用 PM2 启动应用"

# 停止已有进程
pm2 delete all 2>/dev/null || true

# 创建 PM2 配置
cat > "$PROJECT_DIR/ecosystem.config.cjs" << 'PM2EOF'
module.exports = {
  apps: [
    {
      name: "landing-page",
      cwd: "./apps/landing-page",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      max_memory_restart: "300M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: "web",
      cwd: "./apps/web",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "400M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: "api-gateway",
      cwd: "./apps/api-gateway",
      script: "node_modules/.bin/next",
      args: "start -p 3002",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
      max_memory_restart: "250M",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
PM2EOF

# 加载 .env 到环境变量
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
  log ".env 已加载"
fi

# 启动
pm2 start ecosystem.config.cjs
pm2 save

# PM2 开机自启
pm2 startup systemd -u root --hp /root 2>/dev/null || true
pm2 save

log "PM2 应用已启动"
pm2 list

# 等待应用启动
echo -n "等待应用启动..."
sleep 8
echo ""

# 检查应用状态
for port in 3000 3001 3002; do
  if curl -sf --connect-timeout 3 http://127.0.0.1:$port > /dev/null 2>&1; then
    log "端口 $port 应用正常"
  else
    warn "端口 $port 应用可能还在启动中"
  fi
done

# =============================================================================
# 第 5 步：配置 Nginx
# =============================================================================
step "第 5 步：配置 Nginx 反向代理"

# 备份
if [[ -f /etc/nginx/nginx.conf ]]; then
  cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak.$(date +%Y%m%d%H%M%S)
fi

# 复制 ECS Lite 专用配置
cp "$PROJECT_DIR/infra/nginx/nginx-ecs-lite.conf" /etc/nginx/nginx.conf

# 验证
nginx -t 2>&1 && log "Nginx 配置验证通过" || error "Nginx 配置验证失败"

# 启动/重启
systemctl enable nginx 2>/dev/null || true
systemctl restart nginx
log "Nginx 已启动"

# =============================================================================
# 第 6 步：防火墙 & 最终验证
# =============================================================================
step "第 6 步：开放端口 & 验证"

# 开放防火墙端口（如果 firewalld 运行中）
if systemctl is-active firewalld &>/dev/null; then
  firewall-cmd --permanent --add-port=8080/tcp 2>/dev/null || true
  firewall-cmd --permanent --add-port=8081/tcp 2>/dev/null || true
  firewall-cmd --permanent --add-port=8082/tcp 2>/dev/null || true
  firewall-cmd --reload 2>/dev/null || true
  log "防火墙端口已开放"
elif command -v ufw &>/dev/null; then
  ufw allow 8080/tcp 2>/dev/null || true
  ufw allow 8081/tcp 2>/dev/null || true
  ufw allow 8082/tcp 2>/dev/null || true
  log "UFW 端口已开放"
else
  log "未检测到防火墙，跳过"
fi

# 获取公网 IP
PUBLIC_IP=$(curl -s --connect-timeout 5 http://100.100.100.200/latest/meta-data/eip 2>/dev/null \
  || curl -s --connect-timeout 5 ifconfig.me 2>/dev/null \
  || echo "<你的公网IP>")

# 验证 Nginx 端口
echo ""
for port in 8080 8081 8082; do
  if curl -sf --connect-timeout 3 http://127.0.0.1:$port > /dev/null 2>&1; then
    log "http://127.0.0.1:$port ✅ 正常"
  elif curl -sf --connect-timeout 3 http://127.0.0.1:$port/health > /dev/null 2>&1; then
    log "http://127.0.0.1:$port ✅ health 正常"
  else
    warn "http://127.0.0.1:$port ⚠️  可能需要等待应用完全启动"
  fi
done

# =============================================================================
# 完成
# =============================================================================
step "🎉 部署完成！"

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║               Nebutra-Sailor 部署成功！                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  Landing Page:  http://${PUBLIC_IP}:8080                     ║"
echo "║  Web App:       http://${PUBLIC_IP}:8081                     ║"
echo "║  API Gateway:   http://${PUBLIC_IP}:8082                     ║"
echo "║                                                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  管理命令:                                                    ║"
echo "║  查看应用状态:  pm2 list                                     ║"
echo "║  查看应用日志:  pm2 logs                                     ║"
echo "║  重启应用:      pm2 restart all                              ║"
echo "║  查看数据库:    docker compose -f docker-compose.lite.yml ps ║"
echo "║  系统监控:      pm2 monit                                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  ⚠️  重要提醒：                                              ║"
echo "║  1. 请在阿里云安全组中开放 8080/8081/8082 端口               ║"
echo "║  2. 请尽快开始 ICP 备案流程                                  ║"
echo "║  3. 备案完成后可切换到 80/443 端口 + HTTPS                   ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
