# Nebutra-Sailor 阿里云 ECS 部署指南

> 本指南基于项目现有基础设施配置（`docker-compose.prod.yml` + `infra/nginx/nginx-china.conf`），
> 适用于在阿里云 ECS 上通过 Docker Compose 一键部署全部应用。

---

## 前置条件

| 条件 | 说明 |
|------|------|
| 阿里云账号 | 已完成实名认证 |
| ICP 备案 | 面向国内用户**必须**完成，否则 80/443 端口会被封禁（14–28 工作日） |
| 域名 | 已解析到 ECS 公网 IP |
| 本地环境 | Git、SSH 客户端 |

---

## 第一步：购买 ECS 实例

### 推荐配置

| 规格 | 最低要求 | 推荐配置 | 说明 |
|------|---------|---------|------|
| CPU | 4 核 | 8 核 | ai-service 较吃资源 |
| 内存 | 8 GB | 16 GB | ClickHouse 需要 8GB |
| 系统盘 | 40 GB | 100 GB SSD | Docker 镜像需要空间 |
| 数据盘 | 可选 | 100 GB ESSD | 挂载到 /data 存储数据库 |
| 操作系统 | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS | — |
| 地域 | — | cn-hangzhou / cn-shanghai | 根据用户分布选择 |
| 带宽 | 1 Mbps | 5 Mbps（或按量付费） | 按量更灵活 |

### 安全组规则

在阿里云控制台 → ECS → 安全组中放行以下端口：

| 方向 | 端口 | 协议 | 来源 | 用途 |
|------|------|------|------|------|
| 入方向 | 22 | TCP | 你的 IP | SSH 登录 |
| 入方向 | 80 | TCP | 0.0.0.0/0 | HTTP（重定向到 HTTPS） |
| 入方向 | 443 | TCP | 0.0.0.0/0 | HTTPS |

> ⚠️ 不要开放 3000、3001、3002、5432、6379、8123 等内部端口，所有流量通过 Nginx 转发。

---

## 第二步：初始化服务器

SSH 登录到 ECS：

```bash
ssh root@<你的ECS公网IP>
```

### 2.1 系统更新 & 基础工具

```bash
apt update && apt upgrade -y
apt install -y curl git make unzip htop
```

### 2.2 安装 Docker & Docker Compose V2

```bash
# 使用阿里云镜像加速安装 Docker
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

# 配置 Docker 镜像加速器（阿里云专属）
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

systemctl daemon-reload
systemctl enable docker
systemctl restart docker

# 验证安装
docker --version
docker compose version
```

### 2.3 安装 Node.js & pnpm

```bash
# 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 验证
node --version
pnpm --version
```

### 2.4 创建数据目录（如有数据盘）

```bash
# 如果购买了数据盘，先格式化并挂载
# mkfs.ext4 /dev/vdb
# mkdir -p /data
# mount /dev/vdb /data
# echo '/dev/vdb /data ext4 defaults 0 0' >> /etc/fstab

mkdir -p /data/{postgres,redis,clickhouse}
```

---

## 第三步：拉取代码

```bash
# 创建部署目录
mkdir -p /opt/nebutra
cd /opt/nebutra

# 克隆仓库（使用 SSH 或 HTTPS）
git clone git@github.com:nebutra/nebutra-sailor.git .
# 或: git clone https://github.com/nebutra/nebutra-sailor.git .

# 安装依赖
pnpm install
```

---

## 第四步：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env`，填入生产环境值。以下是关键变量：

```bash
# ============ 基础配置 ============
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.你的域名.com
NEXT_PUBLIC_LANDING_URL=https://你的域名.com

# ============ 数据库 ============
DATABASE_URL=postgresql://postgres:你的安全密码@postgres:5432/nebutra
POSTGRES_PASSWORD=你的安全密码

# ============ Redis ============
REDIS_URL=redis://redis:6379

# ============ ClickHouse ============
CLICKHOUSE_PASSWORD=你的安全密码

# ============ ICP 备案号（中国大陆必填）============
NEXT_PUBLIC_ICP_NUMBER=你的ICP备案号

# ============ 内部微服务地址（Docker 网络内部）============
AI_SERVICE_URL=http://ai-service:8000
CONTENT_SERVICE_URL=http://content-service:8000
RECSYS_SERVICE_URL=http://recsys-service:8000
ECOMMERCE_SERVICE_URL=http://ecommerce-service:8000
WEB3_SERVICE_URL=http://web3-service:8000
BILLING_SERVICE_URL=http://billing-service:8000
EVENT_INGEST_SERVICE_URL=http://event-ingest-service:8000
CLICKHOUSE_HTTP_URL=http://clickhouse:8123

# ============ 其他服务密钥（按需填写）============
# OPENAI_API_KEY=...
# STRIPE_SECRET_KEY=...
# RESEND_API_KEY=...
```

> ⚠️ 请使用强密码，可用 `openssl rand -base64 32` 生成。

---

## 第五步：配置 Nginx & SSL 证书

### 5.1 使用中国专用 Nginx 配置

你的项目已经有针对中国网络环境优化的 Nginx 配置：

```bash
# 将中国专用配置作为主配置
cp infra/nginx/nginx-china.conf infra/nginx/nginx.conf
```

### 5.2 修改域名

编辑 `infra/nginx/conf.d/` 下的 server 配置文件，将域名替换为你的实际域名：

```
nebutra.com       → 你的域名.com
app.nebutra.com   → app.你的域名.com
api.nebutra.com   → api.你的域名.com
```

### 5.3 获取 SSL 证书

**方式 A：Let's Encrypt（免费，推荐）**

```bash
# 先创建证书目录
mkdir -p /etc/ssl/nebutra

# 首次获取证书（先注释掉 nginx.conf 中的 SSL 相关行，用 HTTP 模式启动 nginx）
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm certbot certonly --webroot \
  -w /var/www/certbot \
  -d 你的域名.com \
  -d app.你的域名.com \
  -d api.你的域名.com \
  --email 你的邮箱@example.com \
  --agree-tos --no-eff-email

# 复制证书到 Nginx 读取的路径
cp /etc/letsencrypt/live/你的域名.com/fullchain.pem /etc/ssl/nebutra/
cp /etc/letsencrypt/live/你的域名.com/privkey.pem /etc/ssl/nebutra/
```

**方式 B：阿里云免费 SSL 证书**

1. 登录阿里云控制台 → 数字证书管理服务
2. 申请免费 DV 证书（每年 20 张）
3. 下载 Nginx 格式证书
4. 放到 `/etc/ssl/nebutra/` 目录

---

## 第六步：构建 & 启动

### 6.1 构建应用

```bash
cd /opt/nebutra

# 构建 Next.js 应用
pnpm turbo build --filter=@nebutra/web --filter=@nebutra/landing-page

# 构建 API Gateway
pnpm turbo build --filter=@nebutra/api-gateway
```

### 6.2 启动全部服务

```bash
# 使用生产覆盖文件启动
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 查看服务状态
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=100
```

### 6.3 初始化数据库

```bash
# 运行数据库迁移
bash infra/scripts/setup-db.sh
```

---

## 第七步：验证部署

```bash
# 检查所有容器是否健康
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# 测试 Nginx
curl -I http://你的域名.com      # 应返回 301 → HTTPS
curl -I https://你的域名.com     # 应返回 200

# 测试各应用
curl -s https://你的域名.com | head -20          # Landing Page
curl -s https://app.你的域名.com | head -20       # Web App
curl -s https://api.你的域名.com/health           # API Gateway
```

---

## 运维指南

### 查看日志

```bash
# 所有服务
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# 单个服务
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f api-gateway
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f nginx
```

### 更新部署

```bash
cd /opt/nebutra

# 拉取最新代码
git pull origin main

# 重新安装依赖 & 构建
pnpm install
pnpm turbo build --filter=@nebutra/web --filter=@nebutra/landing-page --filter=@nebutra/api-gateway

# 重建并重启变更的服务
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 运行数据库迁移（如有）
bash infra/scripts/setup-db.sh
```

### 数据库备份

```bash
# 手动备份
bash infra/scripts/backup-db.sh

# 设置定时备份（每天凌晨 3 点）
crontab -e
# 添加: 0 3 * * * /opt/nebutra/infra/scripts/backup-db.sh >> /var/log/nebutra-backup.log 2>&1
```

### SSL 证书自动续期

```bash
# Let's Encrypt 自动续期（每天检查两次）
crontab -e
# 添加: 0 0,12 * * * docker compose -f /opt/nebutra/docker-compose.yml -f /opt/nebutra/docker-compose.prod.yml run --rm certbot renew --quiet && docker compose -f /opt/nebutra/docker-compose.yml -f /opt/nebutra/docker-compose.prod.yml exec nginx nginx -s reload
```

### 监控

```bash
# 系统资源
htop
df -h
free -h

# Docker 资源使用
docker stats

# Nginx 访问日志
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/access.log
```

---

## 资源限制参考（来自 docker-compose.prod.yml）

| 服务 | CPU 限制 | 内存限制 |
|------|---------|---------|
| nginx | 1.0 核 | 256 MB |
| web (Next.js) | 2.0 核 | 1 GB |
| landing-page | 1.0 核 | 512 MB |
| api-gateway | 2.0 核 | 512 MB |
| ai-service | 4.0 核 | 4 GB |
| postgres | 2.0 核 | 2 GB |
| redis | 1.0 核 | 512 MB |
| clickhouse | 4.0 核 | 8 GB |
| 其他微服务 | 各 1–2 核 | 各 512 MB–2 GB |

> 全部服务总计约需 **8 核 16 GB** 起步。

---

## ICP 备案提醒

如果你的网站面向中国大陆用户，**必须完成以下备案**：

1. **ICP 备案**（工信部）：https://help.aliyun.com/product/35468.html
   - 在阿里云控制台 → ICP 备案 提交
   - 审核周期：14–28 个工作日
   - 未备案将被封禁 80/443 端口

2. **公安备案**：ICP 备案通过后 30 天内完成
   - 网址：https://www.beian.gov.cn/

3. 备案通过后，在 `.env` 中设置：
   ```
   NEXT_PUBLIC_ICP_NUMBER=你的备案号
   ```

---

## 常见问题

**Q: pgvector 扩展怎么办？**
项目使用 Docker 内的 `pgvector/pgvector:pg16` 镜像，已内置 pgvector 支持，无需额外配置。如果改用阿里云 RDS，需选择 PolarDB-PG 或在 ECS 上自建 PostgreSQL。

**Q: 域名还没备案能先测试吗？**
可以，通过 IP + 端口直接访问（临时开放安全组端口），但 80/443 端口在备案完成前会被阿里云封禁。

**Q: 如何扩容？**
如果单台 ECS 不够用，可以考虑：将数据库迁移到阿里云 RDS（PostgreSQL）、Redis 迁移到云数据库 Redis 版，让 ECS 只跑应用服务。或者升级到 ACK（Kubernetes），项目已有 Terraform 模块支持。
