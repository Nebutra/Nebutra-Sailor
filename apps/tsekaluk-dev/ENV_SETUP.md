# 环境变量配置指南

本项目需要以下环境变量。将 `.env.example` 复制为 `.env.local`，按下方说明填写。

```bash
cp .env.example .env.local
```

---

## AUTH_SECRET

用于加密 session cookie 的密钥（Better Auth）。

```bash
openssl rand -base64 32
```

将输出结果粘贴到 `AUTH_SECRET=` 后面即可。

## BETTER_AUTH_URL

Better Auth 的 base URL。生产环境设为 `https://tsekaluk.dev`，本地开发设为 `http://localhost:3002`。

---

## ANTHROPIC_API_KEY

Soul 对话功能使用 Claude Haiku 模型。

1. 打开 https://console.anthropic.com/settings/keys
2. 点击 **Create Key**
3. 复制以 `sk-ant-` 开头的密钥

---

## GitHub OAuth

### 获取 GITHUB_ID 和 GITHUB_SECRET

1. 打开 https://github.com/settings/developers
2. 点击 **New OAuth App**
3. 填写：
   - **Application name**: `tsekaluk.dev`
   - **Homepage URL**: `https://tsekaluk.dev`
   - **Authorization callback URL**: `https://tsekaluk.dev/api/auth/callback/github`
4. 点击 **Register application**
5. 页面上的 **Client ID** 即为 `GITHUB_ID`
6. 点击 **Generate a new client secret**，生成的值即为 `GITHUB_SECRET`

> 本地开发时 callback URL 改为 `http://localhost:3002/api/auth/callback/github`

---

## Google OAuth

### 获取 GOOGLE_ID 和 GOOGLE_SECRET

1. 打开 https://console.cloud.google.com/apis/credentials
2. 创建项目（如已有项目可跳过）
3. 点击 **+ CREATE CREDENTIALS** → **OAuth client ID**
4. 如果提示需要先配置 OAuth consent screen：
   - User Type 选 **External**
   - 填写应用名称、用户支持邮箱、开发者联系邮箱
   - Scopes 添加 `email` 和 `profile`
   - 点击 **Save and Continue** 直到完成
5. 回到 Credentials 页面，点击 **+ CREATE CREDENTIALS** → **OAuth client ID**
6. Application type 选 **Web application**
7. 填写：
   - **Name**: `tsekaluk.dev`
   - **Authorized redirect URIs**: `https://tsekaluk.dev/api/auth/callback/google`
8. 点击 **Create**
9. 弹窗中的 **Client ID** 即为 `GOOGLE_ID`，**Client secret** 即为 `GOOGLE_SECRET`

> 本地开发时额外添加 redirect URI: `http://localhost:3002/api/auth/callback/google`

---

## Linux DO Connect OAuth

### 获取 LINUXDO_ID 和 LINUXDO_SECRET

1. 用 Linux DO 账号登录 https://connect.linux.do
2. 进入 https://connect.linux.do/dash/sso
3. 点击 **新建应用**
4. 填写：
   - **应用名称**: `tsekaluk.dev`
   - **回调地址**: `https://tsekaluk.dev/api/auth/callback/linuxdo`
5. 提交后获得 **Client ID** 和 **Client Secret**
6. 分别填入 `LINUXDO_ID` 和 `LINUXDO_SECRET`

> 本地开发时回调地址改为 `http://localhost:3002/api/auth/callback/linuxdo`

---

## DATABASE_URL（Prisma + Supabase Postgres）

Guestbook 功能使用 Prisma ORM 连接 Supabase Postgres（仅 DB，不使用 Supabase Auth）。

### 获取 DATABASE_URL

1. 打开 https://supabase.com 并登录或注册
2. 点击 **New Project**，创建项目（选择合适的区域）
3. 项目创建完成后，进入 **Settings → Database**
4. 在 **Connection string** 区域选择 **URI** 标签
5. 复制连接字符串，替换 `[YOUR-PASSWORD]` 为你创建项目时设置的数据库密码
6. 填入 `DATABASE_URL`

格式示例：
```
DATABASE_URL=postgresql://postgres:你的密码@db.xxxxx.supabase.co:5432/postgres
```

### 同步数据库

```bash
pnpm --filter @nebutra/tsekaluk-dev prisma db push
```

此命令会根据 `prisma/schema.prisma` 自动创建/更新数据库表结构。

---

## ADMIN_EMAIL

Admin panel access control. The email address of the admin user — must exactly match the email from your OAuth provider (GitHub/Google).

Set this to your own email address (e.g., the one you use to sign in via GitHub or Google):

```
ADMIN_EMAIL=you@example.com
```

Only users whose session email matches this value can access `/admin`. All other authenticated users will see a 403 page. Unauthenticated users are redirected to sign in.

> The Linux DO provider does not expose an email address. If you use Linux DO as your primary auth method, use GitHub or Google to sign into the admin panel.

---

## Vercel 部署

在 Vercel 项目设置中添加以上所有环境变量：

1. 打开 https://vercel.com → 项目 → Settings → Environment Variables
2. 逐个添加，Environment 选 **Production**（如需预览环境也勾选 Preview）
3. 重新部署生效
