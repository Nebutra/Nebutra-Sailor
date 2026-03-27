#!/usr/bin/env bash
# =============================================================================
# Nebutra-Sailor ECS Lite 一键部署脚本
# 适用于：阿里云 ECS 2核4GB / Alibaba Cloud Linux / Ubuntu
# 未备案模式：使用 8080/8081/8082 端口（非 80/443）
#
# 使用方法:
#   chmod +x infra/scripts/deploy-ecs-lite.sh
#   sudo bash infra/scripts/deploy-ecs-lite.sh
#
# 部署架构:
#   Docker: PostgreSQL + Redis（基础设施）
#   PM2:    landing-page + web + api-gateway（Node.js 应用）
#   Nginx:  反向代理（8080/8081/8082 端口）
#
# 服务地址（部署完成后）:
#   Landing Page: http://<ECS公网IP>:8080
#   Web App:      http://<ECS公网IP>:8081
#   API Gateway:  http://<ECS公网IP>:8082
# =============================================================================

set -euo pipefail

# ── 颜色输出 ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step()  { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}\n"; }

# ── 检查 root 权限 ───────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "请使用 sudo 或 root 用户运行此脚本"
fi

# ── 项目路径 ──────────────────────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"
log "项目目录: $PROJECT_DIR"

# =============================================================================
# 第 1 步：系统依赖
# =============================================================================
step "第 1 步：安装系统依赖"

# 检测包管理器
if command -v apt-get &>/dev/null; then
  PKG_MANAGER="apt"
  apt-get update -qq
  apt-get install -y -qq curl git make nginx > /dev/null 2>&1
elif command -v yum &>/dev/null; then
  PKG_MANAGER="yum"
  yum install -y -q curl git make nginx > /dev/null 2>&1
else
  error "不支持的包管理器，请使用 Ubuntu 或 Alibaba Cloud Linux"
fi
log "系统依赖安装完成 (${PKG_MANAGER})"

# =============================================================================
# 第 2 步：安装 Docker
# =============================================================================
step "第 2 步：安装 Docker"

if command -v docker &>/dev/null; then
  log "Docker 已安装: $(docker --version)"
else
  warn "正在安装 Docker..."
  curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

  # 配置镜像加速
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json << 'DOCKEREOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
DOCKEREOF

  systemctl daemon-reload
  systemctl enable docker
  systemctl restart docker
  log "Docker 安装完成"
fi

# 确保 docker compose 可用
if ! docker compose version &>/dev/null; then
  error "Docker Compose V2 不可用，请升级 Docker"
fi
log "Docker Compose: $(docker compose version --short)"

# =============================================================================
# 第 3 步：安装 Node.js + pnpm + PM2
# =============================================================================
step "第 3 步：安装 Node.js + pnpm + PM2"

if command -v node &>/dev/null && [[ "$(node -v)" == v2* ]]; then
  log "Node.js 已安装: $(node -v)"
else
  warn "正在安装 Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  $PKG_MANAGER install -y nodejs > /dev/null 2>&1 || apt-get install -y nodejs > /dev/null 2>&1
  log "Node.js 安装完成: $(node -v)"
fi

if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm > /dev/null 2>&1
fi
log "pnpm: $(pnpm -v)"

if ! command -v pm2 &>/dev/null; then
  npm install -g pm2 > /dev/null 2>&1
fi
log "PM2: $(pm2 -v)"

# =============================================================================
# 第 4 步：创建 .env 文件（如不存在）
# =============================================================================
step "第 4 步：检查环境变量"

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  warn ".env 文件不存在，从模板创建..."
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"

  # 生成随机密码
  DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)
  CH_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)

  # 替换数据库相关配置为 Docker 内部网络地址
  sed -i "s|postgresql://postgres:postgres@localhost|postgresql://postgres:${DB_PASS}@localhost|g" "$PROJECT_DIR/.env"

  echo "" >> "$PROJECT_DIR/.env"
  echo "# ============ 生产环境自动生成 ============" >> "$PROJECT_DIR/.env"
  echo "POSTGRES_PASSWORD=${DB_PASS}" >> "$PROJECT_DIR/.env"
  echo "CLICKHOUSE_PASSWORD=${CH_PASS}" >> "$PROJECT_DIR/.env"
  echo "NODE_ENV=production" >> "$PROJECT_DIR/.env"

  warn "⚠️  请编辑 .env 文件填入其他必要的密钥（Clerk, Stripe, OpenAI 等）"
  warn "   vim $PROJECT_DIR/.env"
  warn "   填好后重新运行此脚本"
  warn ""
  warn "   至少需要配置："
  warn "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  warn "   - CLERK_SECRET_KEY"
  warn "   - DATABASE_URL（已自动生成密码）"
  warn ""

  # 询问是否继续
  read -r -p "是否继续部署？(y/N): " CONTINUE
  if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
    log "已暂停。请编辑 .env 后重新运行。"
    exit 0
  fi
else
  log ".env 文件已存在"
fi

# 加载 .env
set -a
source "$PROJECT_DIR/.env"
set +a

# =============================================================================
# 第 5 步：启动基础设施（PostgreSQL + Redis）
# =============================================================================
step "第 5 步：启动数据库服务（Docker）"

# 使用 lite compose 启动 postgres + redis
docker compose -f docker-compose.lite.yml up -d

# 等待数据库就绪
echo -n "等待 PostgreSQL 就绪..."
for i in $(seq 1 30); do
  if docker compose -f docker-compose.lite.yml exec -T postgres pg_isready -U postgres &>/dev/null; then
    echo ""
    log "PostgreSQL 就绪"
    break
  fi
  echo -n "."
  sleep 2
done

echo -n "等待 Redis 就绪..."
for i in $(seq 1 15); do
  if docker compose -f docker-compose.lite.yml exec -T redis redis-cli ping &>/dev/null; then
    echo ""
    log "Redis 就绪"
    break
  fi
  echo -n "."
  sleep 1
done

# =============================================================================
# 第 6 步：安装项目依赖 & 构建
# =============================================================================
step "第 6 步：安装依赖并构建应用"

log "安装 pnpm 依赖..."
pnpm install --frozen-lockfile 2>&1 | tail -3

log "构建 Landing Page..."
pnpm turbo build --filter=@nebutra/landing-page 2>&1 | tail -5

log "构建 Web App..."
pnpm turbo build --filter=@nebutra/web 2>&1 | tail -5

log "构建 API Gateway..."
pnpm turbo build --filter=@nebutra/api-gateway 2>&1 | tail -5

log "所有应用构建完成"

# =============================================================================
# 第 7 步：配置 PM2 启动应用
# =============================================================================
step "第 7 步：使用 PM2 启动 Node.js 应用"

# 先停止已有的 PM2 进程
pm2 delete all 2>/dev/null || true

# 创建 PM2 生态文件
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

# 启动所有应用
pm2 start ecosystem.config.cjs
pm2 save

# 设置 PM2 开机自启
pm2 startup systemd -u root --hp /root 2>/dev/null || true
pm2 save

log "PM2 应用已启动"
pm2 list

# =============================================================================
# 第 8 步：配置 Nginx 反向代理
# =============================================================================
step "第 8 步：配置 Nginx 反向代理"

# 备份原有配置
if [[ -f /etc/nginx/nginx.conf ]]; then
  cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
fi

# 复制 ECS Lite 专用配置
cp "$PROJECT_DIR/infra/nginx/nginx-ecs-lite.conf" /etc/nginx/nginx.conf

# 验证配置
nginx -t 2>&1 && log "Nginx 配置验证通过" || error "Nginx 配置验证失败"

# 重启 Nginx
systemctl enable nginx
systemctl restart nginx
log "Nginx 已启动"

# =============================================================================
# 第 9 步：配置 Swap（2核4GB 强烈建议）
# =============================================================================
step "第 9 步：配置 Swap 空间"

if [[ ! -f /swapfile ]]; then
  log "创建 4GB Swap 文件（防止内存不足 OOM）..."
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab

  # 优化 swap 参数
  sysctl vm.swappiness=10
  sysctl vm.overcommit_memory=1
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo 'vm.overcommit_memory=1' >> /etc/sysctl.conf

  log "Swap 已创建 (4GB)"
else
  log "Swap 已存在"
fi

# =============================================================================
# 第 10 步：运行数据库迁移
# =============================================================================
step "第 10 步：数据库迁移"

if [[ -f "$PROJECT_DIR/infra/scripts/setup-db.sh" ]]; then
  warn "如需初始化数据库，请运行: bash infra/scripts/setup-db.sh"
  warn "或运行: pnpm db:migrate"
else
  warn "未找到数据库迁移脚本，请手动运行: pnpm db:migrate"
fi

# =============================================================================
# 部署完成
# =============================================================================
step "部署完成！"

# 获取公网 IP
PUBLIC_IP=$(curl -s --connect-timeout 5 http://100.100.100.200/latest/meta-data/eip 2>/dev/null \
  || curl -s --connect-timeout 5 ifconfig.me 2>/dev/null \
  || echo "<你的公网IP>")

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   Nebutra-Sailor 部署成功                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  Landing Page:  http://${PUBLIC_IP}:8080               ║"
echo "║  Web App:       http://${PUBLIC_IP}:8081               ║"
echo "║  API Gateway:   http://${PUBLIC_IP}:8082               ║"
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
