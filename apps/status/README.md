# Nebutra Status

[中文](#中文) · [English](#english)

---

## 中文

### 这是什么

Nebutra Status 是一个可自部署的状态页：一个 Docker 镜像 + 一个 Postgres。公开状态页、API、
内置监控在同一个进程里运行。核心抽象是**证据**：组件的颜色不是"探一下通不通"，而是"最近一次
有效证据是什么、多新鲜、证明到哪一层"。

- **证据新鲜度**：每条证据自带 `freshnessSeconds`。超过窗口算 degraded，超过两倍算 outage——
  停掉的探针不可能让页面一直绿着。
- **覆盖类型**：`dependency`（依赖探测）、`synthetic`（合成用户旅程）、`device`（设备舰队）、
  `upstream`（上游厂商状态页）、`manual`。"接口在响应"和"用户能登录"是两种不同的声明。
- **发布闸门 API**：CI 在切流前问"这些组件在发布开始之后有没有新鲜的已验证证据"。
- **兼容 profile**：输出老系统的 JSON 形状（目前 `xiaoya-v1`），换掉手搓状态页时部署脚本一行不改。
- **中英双语**：页面语言为一等公民。

### 和同类自部署方案比较

| | 我们沿用的 | 我们补上的 |
|---|---|---|
| Uptime Kuma | 内置 HTTP/关键字监控 + 状态页、确认重试 | 配置即代码；证据新鲜度与覆盖类型；业务旅程推送 |
| Gatus | 配置即代码（一个文件声明全部端点 → `status.config.json`） | 事故/维护时间线、90 天日条、推送证据 API |
| OpenStatus | 同一份代码两种发行（自部署 + 托管云） | 中国大陆自部署友好、发布闸门、兼容 profile |
| Cachet / cState | 经典事故页：事故、维护、订阅源 | 状态由证据推导，事故只能让状态更差，不能遮住故障 |

### 快速开始（docker compose）

```bash
# 在仓库根目录构建镜像
docker build -f apps/status/Dockerfile -t nebutra-status .

cd apps/status
cp examples/status.config.json ./status.config.json   # 改成你的组件
export STATUS_SETUP_TOKEN=$(openssl rand -hex 24)
export STATUS_DB_PASSWORD=$(openssl rand -hex 16)
docker compose up -d
```

容器启动时先执行 `prisma migrate deploy`，再读取 `/config/status.config.json` 应用配置，然后在
`:3140` 提供服务。`/api/healthz`（数据库 ping）与 `/api/readyz` 供负载均衡探活。

**创建第一个管理员并签发 API key**（实例里还没有任何成员时，凭 `STATUS_SETUP_TOKEN` 才能做一次）：

```bash
curl -c jar -X POST http://localhost:3140/api/v1/auth/setup -H 'content-type: application/json' \
  -d '{"setupToken":"'$STATUS_SETUP_TOKEN'","email":"you@example.com","password":"至少 12 位的密码","workspaceSlug":"acme"}'

curl -b jar -X POST http://localhost:3140/api/v1/keys -H 'content-type: application/json' \
  -H 'origin: http://localhost:3140' \
  -d '{"name":"probes","scopes":["evidence:write","status:read"]}'
# → {"key":"ns_…"}  明文只出现这一次，数据库里只存 sha256
```

带会话 cookie 的写请求必须带与实例一致的 `Origin` 头（浏览器会自动带上；curl 需手写），用 API key 的请求不需要。
`workspaceSlug` 要与 `status.config.json` 里的 `workspace.slug` 一致。完成后可以去掉
`STATUS_SETUP_TOKEN`。API key 的 scope：`status:read`、`evidence:write`、`incidents:write`。
角色：owner/admin 管理 key，editor 可写事故。

### `status.config.json`

配置即代码：页面、分组、组件、监控写在文件里，实例启动时幂等地应用。事故、证据、订阅者是运行时数据，
不进文件。组件按 `key` 匹配——改名保留历史；从文件删掉的组件连同历史一起删除。

```jsonc
{
  "workspace": { "slug": "acme", "name": "Acme" },
  "page": {
    "slug": "acme", "title": "Acme Status", "description": "…",
    "locales": ["zh-CN", "en"],          // 第一个是默认语言
    "compatProfile": "xiaoya-v1"         // 可选
  },
  "groups": [{ "key": "product", "name": "产品", "nameI18n": { "en": "Product" }, "description": "…" }],
  "components": [{
    "key": "api", "name": "API", "group": "product",
    "public": true,                      // false = 参与判定与闸门，但不公开
    "monitors": [{
      "kind": "http",                    // http | keyword | json_status | statuspage
      "coverage": "dependency",          // 这条监控的证据算哪种覆盖
      "url": "https://api.acme.example/healthz",
      "method": "GET",                   // GET | HEAD
      "expectStatus": [200, 399],
      "keyword": "ok",                   // kind=keyword 时必填
      "timeoutMs": 5000,
      "intervalSeconds": 60              // 证据新鲜度 = 3 × 间隔
    }]
  }]
}
```

监控类型：`http` 按状态码判定（5xx outage、4xx degraded）；`keyword` 要求响应体包含关键字；
`json_status` 读 `{status}` / `{overall}` / `{ready}`；`statuspage` 读 Atlassian Statuspage 的
`/api/v2/status.json`（`none/minor/major/critical/maintenance`）。失败要第二次尝试确认才记录。
多副本部署时由数据库租约保证同一时刻只有一个副本在探测。完整示例见 `examples/`。

### 推送证据

```bash
curl -X POST https://status.example.com/api/v1/pages/acme/evidence \
  -H "authorization: Bearer $NS_KEY" -H 'content-type: application/json' \
  -d '{"component":"sign-in","source":"journey.login","coverage":"synthetic",
       "state":"operational","latencyMs":412,"freshnessSeconds":900}'
```

| 字段 | 说明 |
|---|---|
| `component` | 组件 key |
| `source` | 调用方自取的来源名（`monitor:` 前缀保留给内置监控）；同一组件同一来源只保留最新一条 |
| `coverage` | `dependency` / `synthetic` / `device` / `upstream` / `manual` |
| `state` | `operational` / `degraded` / `outage` / `maintenance` / `unknown` |
| `checkedAt` | 可选，RFC 3339；缺省为收到时间；晚到的旧读数会被忽略 |
| `latencyMs`、`note` | 可选 |
| `freshnessSeconds` | 10 秒 – 7 天 |

批量：`{"readings":[…]}`，最多 100 条。全部接受 202；全部是未知组件 404；部分接受 207，
`results[]` 逐条给出状态。校验失败 422，整批不写入。

### 发布闸门

```bash
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
# …发布、等待合成旅程跑完…
curl -fsS "https://status.example.com/api/v1/pages/acme/gate?components=sign-in,checkout&since=$started"
```

只有每个组件都有 `coverage`（默认 `synthetic`）的证据、全部新鲜、全部 operational、且
`checkedAt >= since` 时返回 `200 {"pass":true}`；否则 `412`，并逐个给出 `reason`：
`unknown_component` / `no_evidence` / `stale` / `failing` / `before_since`。公开组件可匿名查询；
带 `status:read` key 时也能查内部组件。

### 其他接口

| 路径 | 说明 |
|---|---|
| `GET /api/v1/pages/:slug/status` | 原生 JSON（`version: 1`），只含公开组件，`s-maxage=15` |
| `GET/POST /api/v1/pages/:slug/incidents`、`PATCH …/incidents/:id` | 事故与维护；`incidents:write` key 或 editor 以上的登录会话 |
| `GET /api/v1/pages/:slug/feed.atom`、`feed.rss` | 事故与维护订阅源 |
| `GET /compat/xiaoya-v1/:slug/status.json` | 兼容 profile |
| `POST /api/v1/auth/{setup,sign-in,sign-out}`、`GET /api/v1/auth/me` | 账号 |
| `GET/POST /api/v1/keys`、`DELETE /api/v1/keys/:id` | API key（owner/admin） |

### 兼容 profile：`xiaoya-v1`（小芽）

输出与小芽 Go `PublicStatusResp` 字节兼容的 JSON：字段顺序、`omitempty`、秒精度 `Z` 结尾的
RFC 3339 时间、Go 默认的 HTML 安全转义都一致。小芽 `scripts/deploy.sh` 的两道 jq 闸门
（`family-contact` 为 operational/degraded；四个核心旅程 `verification.coverage=="synthetic"`、
`verified==true`、`checked_at >= $started`）在 `src/server/compat/xiaoya-v1.test.ts` 里用 TS 原样复现。

映射规则：组件 `id` = 组件 key；状态只有三种，`maintenance` 与 `unknown` 都输出 `degraded`；
组件有 synthetic 证据时 `verification.coverage="synthetic"`，否则 `{"coverage":"dependency_only","verified":false}`；
`verified` = 状态 operational 且有过成功记录。

**小芽接入步骤**

1. 在小芽的服务器上跑容器，配置用 `examples/xiaoya.status.config.json`（17 个服务、4 个分组，
   `notification-delivery` 不公开）。状态页放在**独立子域**（例如 `status.<小芽域名>`，在父域名的
   ICP 备案范围内），环境变量：
   ```
   STATUS_DEFAULT_PAGE=xiaoya
   STATUS_COMPAT_ROOT=xiaoya-v1
   STATUS_PUBLIC_URL=https://status.<小芽域名>
   ```
2. 子域整站反代到实例；小芽主域名只转发 JSON 接口（没有静态资源），`/status` 302 到子域：
   ```nginx
   # status.<小芽域名>
   server {
     server_name status.<小芽域名>;
     location / { proxy_pass http://127.0.0.1:3140; proxy_set_header Host $host;
                  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
   }
   # 小芽主域名
   location = /api/v1/status { proxy_pass http://127.0.0.1:3140; }
   location = /status        { return 302 https://status.<小芽域名>/; }
   ```
   `deploy.sh` 继续读 `$PUBLIC_BASE_URL/api/v1/status`，一行不改。
3. Go 的业务旅程（`business_probe.go`）每跑完一次推一条 synthetic 证据，`source` 用探针 id，
   `freshnessSeconds` 用小芽的 `BusinessProbeFreshness`（默认 15 分钟 = 900）：
   ```go
   body, _ := json.Marshal(map[string]any{
       "component":        "identity-access",          // ServiceID
       "source":           "auth-session",             // ProbeID
       "coverage":         "synthetic",
       "state":            string(probe.Status),       // operational | degraded | outage
       "checkedAt":        checkedAt.UTC().Format(time.RFC3339),
       "latencyMs":        probe.LatencyMS,
       "note":             probe.ErrorCode,
       "freshnessSeconds": 900,
   })
   req, _ := http.NewRequestWithContext(ctx, http.MethodPost,
       "http://127.0.0.1:3140/api/v1/pages/xiaoya/evidence", bytes.NewReader(body))
   req.Header.Set("Authorization", "Bearer "+os.Getenv("NEBUTRA_STATUS_KEY"))
   req.Header.Set("Content-Type", "application/json")
   ```
   等价的 curl：
   ```bash
   curl -X POST http://127.0.0.1:3140/api/v1/pages/xiaoya/evidence \
     -H "authorization: Bearer $NEBUTRA_STATUS_KEY" -H 'content-type: application/json' \
     -d '{"component":"identity-access","source":"auth-session","coverage":"synthetic","state":"operational","checkedAt":"2026-10-16T08:00:05Z","latencyMs":180,"freshnessSeconds":900}'
   ```
4. 依赖类组件（数据库、Redis、AI 网关……）在迁成监控之前，由 Go 每分钟把现有
   `statusServices` 的结果按 `coverage:"dependency"`、`freshnessSeconds:180` 批量推上来
   （`{"readings":[…]}`）。没有任何证据的组件显示 degraded——这是有意的，不会假装绿。

### 环境变量

| 变量 | 说明 |
|---|---|
| `STATUS_DATABASE_URL` | Postgres 连接串（必填） |
| `STATUS_SETUP_TOKEN` | 创建第一个 owner 的一次性口令；不设置则关闭初始化 |
| `STATUS_CONFIG_FILE` | 启动时应用的配置文件路径；出错只记日志，不阻止启动 |
| `STATUS_RUNNER` | `off` 关闭进程内监控（例如只做只读副本） |
| `STATUS_PUBLIC_URL` | 公网 origin；默认页链接为 `<origin>/status`，其他页为 `<origin>/p/<slug>` |
| `STATUS_DEFAULT_PAGE` | `/` 与 `/status` 展示的页面 slug |
| `STATUS_COMPAT_ROOT` | `xiaoya-v1`：在 `/api/v1/status` 输出该兼容形状（需配合 `STATUS_DEFAULT_PAGE`） |
| `STATUS_DEBUG` | 输出 debug 日志 |
| `PORT` | 默认 3140 |

日志是 stderr 上的一行一个 JSON。

### 开发

```bash
pnpm --filter @nebutra/status-app dev                     # :3140
cd apps/status && npx vitest run --testTimeout=30000       # PGlite，无需本地 Postgres
pnpm --filter @nebutra/status-app db:migration <name>      # 改 prisma/schema.prisma 后生成迁移
```

---

## English

### What it is

Nebutra Status is a self-hostable status page: one Docker image and one Postgres. Public pages,
the API and built-in monitors run in one process. Its core idea is **evidence**: a component's
colour is not "did a ping succeed" but "what is the latest valid proof, how fresh is it, and how deep
does it go".

- **Freshness** — each reading carries `freshnessSeconds`. Past the window it reads degraded, past
  twice the window outage. A dead probe cannot keep a page green.
- **Coverage** — `dependency`, `synthetic` (user journeys), `device`, `upstream`, `manual`.
  "The endpoint answers" and "a user can sign in" are different claims.
- **Deploy gate API** — CI asks whether given components have fresh, verified evidence since the
  release started.
- **Compat profiles** — emit a legacy JSON shape (today `xiaoya-v1`) so replacing a hand-built
  status page changes no deploy script.
- **Chinese and English** as first-class page languages.

### Compared with other self-hosted options

| | What we keep | What we add |
|---|---|---|
| Uptime Kuma | Built-in HTTP/keyword monitors with a status page, confirm-retry | Config as code; evidence freshness and coverage; pushed journey results |
| Gatus | Config as code: one file declares every endpoint (`status.config.json`) | Incident/maintenance timelines, 90-day bars, an evidence push API |
| OpenStatus | One codebase, two distributions (self-hosted + hosted cloud) | Mainland-China-friendly self-hosting, deploy gate, compat profiles |
| Cachet / cState | Classic incident pages: incidents, maintenance, feeds | State derived from evidence; an incident can only worsen it, never hide a failure |

### Quick start (docker compose)

```bash
docker build -f apps/status/Dockerfile -t nebutra-status .   # from the repo root
cd apps/status
cp examples/status.config.json ./status.config.json
export STATUS_SETUP_TOKEN=$(openssl rand -hex 24) STATUS_DB_PASSWORD=$(openssl rand -hex 16)
docker compose up -d
```

On start the container runs `prisma migrate deploy`, applies `/config/status.config.json`, and
serves on `:3140`. `/api/healthz` (database ping) and `/api/readyz` are for health checks.

Create the first owner (only while the instance has no members, and only with
`STATUS_SETUP_TOKEN`), then mint a key:

```bash
curl -c jar -X POST http://localhost:3140/api/v1/auth/setup -H 'content-type: application/json' \
  -d '{"setupToken":"'$STATUS_SETUP_TOKEN'","email":"you@example.com","password":"at least 12 chars","workspaceSlug":"acme"}'
curl -b jar -X POST http://localhost:3140/api/v1/keys -H 'content-type: application/json' \
  -H 'origin: http://localhost:3140' \
  -d '{"name":"probes","scopes":["evidence:write","status:read"]}'
```

Writes authenticated by the session cookie must carry a matching `Origin` header (browsers send it; add it by hand in curl); API-key writes need none. The plaintext `ns_…` key is returned once; only its sha256 is stored. Scopes: `status:read`,
`evidence:write`, `incidents:write`. Owners and admins manage keys; editors write incidents.

### Reference

- **`status.config.json`** — see the annotated example in the Chinese section and `examples/`.
  Applied idempotently on every start, keyed by component `key`: renames keep history, removals
  delete it. Monitor kinds: `http`, `keyword`, `json_status`, `statuspage`. Monitor evidence is
  fresh for three intervals; failures are confirmed by a second attempt; a database lease keeps
  one replica probing at a time.
- **Evidence push** — `POST /api/v1/pages/:slug/evidence` with an `evidence:write` key; one
  reading or `{"readings":[…]}` (≤ 100). 202 all accepted, 207 partly, 404 all unknown, 422 invalid
  (nothing written).
- **Deploy gate** — `GET /api/v1/pages/:slug/gate?components=a,b&since=<RFC3339>&coverage=synthetic`
  → `200 {pass:true}` or `412` with a per-component `reason`
  (`unknown_component | no_evidence | stale | failing | before_since`).
- **Status JSON** — `GET /api/v1/pages/:slug/status`, versioned (`version: 1`), public components only.
- **Incidents** — `GET/POST /api/v1/pages/:slug/incidents`, `PATCH …/incidents/:id`.
- **Feeds** — `feed.atom` and `feed.rss` under the page.
- **Compat `xiaoya-v1`** — `GET /compat/xiaoya-v1/:slug/status.json`, and `GET /api/v1/status`
  when `STATUS_COMPAT_ROOT=xiaoya-v1` and `STATUS_DEFAULT_PAGE` are set. Byte-compatible with
  小芽's Go `PublicStatusResp`. 小芽 serves the page on its own subdomain; its main domain proxies only
  `/api/v1/status` and 302-redirects `/status` there. Full steps are in the Chinese section.
- **Environment** — see the table in the Chinese section.
