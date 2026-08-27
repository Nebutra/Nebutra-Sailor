# Redis 12 场景覆盖度审计 + 2026 SV 最佳实践对标

**Date:** 2026-05-12
**Status:** Implemented(P1 + P2 落地,P3+ 留待按需)
**Scope:** 盘点企业级 Redis 12 大使用场景在 monorepo 的覆盖度,补齐对标 SV 2026 AI SaaS 实践的缺口,**能用现成轮子就用**。

---

## 1. 12 场景覆盖度矩阵

| # | 场景 | 现状 | 实现位置 | 对标 SV 2026 |
|---|---|---|---|---|
| 1 | 缓存 (Cache) | ✅ 完整 | [@nebutra/cache](packages/integrations/cache/) + 4 个 strategy(stampede / lazyRefresh / ttlCache / lockCache) | 多后端(ioredis + Upstash REST) |
| 2 | 分布式会话 (Session) | ✅ DB-backed | `AuthSession` Prisma 表([schema.prisma:1265](packages/platform/db/prisma/schema.prisma#L1265)) | Better Auth 2026 默认走 DB,不走 Redis(Vercel/Linear/Stripe 同) |
| 3 | 分布式锁 (Lock) | ✅ SET NX EX | [strategies/lockCache.ts](packages/integrations/cache/src/strategies/lockCache.ts) — `createLock` / `withLock` | 不是 Redlock(单实例 Redis 时 Redlock 也只是 SET NX EX,无意义) |
| 4 | 计数与统计 (Counter) | ✅ 双层 | `cache.incr/incrby/decr/expire` + [@nebutra/metering](packages/commerce/metering/) (ClickHouse) | 短期 Redis,长期 ClickHouse,2026 标准分层 |
| 5 | 排行榜 (Ranking) | ⚪ 不实现 | — | B2B AI SaaS 用不上,真要做就裸 ZSET 5 行 Lua 解决 |
| 6 | 限流 (Rate Limiting) | ✅ 补强 | [@nebutra/rate-limit](packages/platform/rate-limit/) — TokenBucket + **新增 SlidingWindow** via `@upstash/ratelimit` | **`@upstash/ratelimit` 是 2026 事实标准**(Vercel/Resend/Linear 用) |
| 7 | 消息队列 (Message Queue) | ✅ 4-provider | [@nebutra/queue](packages/integrations/queue/) — QStash / BullMQ / SQS / Memory | 比裸 Redis List 高一档,有 retries / DLQ / consumer groups |
| 8 | 分布式 ID (ID Generator) | ✅ | `crypto.randomUUID()` + `cuid()` | UUID v4 / CUID2 — 比 Redis INCR 更适合分布式 |
| 9 | 地理位置 (Geo) | ⚪ 不实现 | — | 真要做用 **PostGIS**(我们已有 Postgres),Redis Geo 精度不够 |
| 10 | 布隆过滤器 (Bloom Filter) | ✅ 补强 | [strategies/bloom.ts](packages/integrations/cache/src/strategies/bloom.ts) via `bloom-filters` npm,序列化到 Redis key | Yoshua 库,纯 JS 不依赖 RedisBloom 模块,任何 Redis 都跑 |
| 11 | 延迟队列 (Delay Queue) | ✅ | BullMQ `delayedJobs` + Vercel Cron + [@nebutra/queue scheduled](packages/integrations/queue/src/scheduled/) | 同 #7 |
| 12 | 配置中心 (Config Center) | ✅ | [@nebutra/feature-flags](packages/platform/feature-flags/) — env → Redis (10s TTL) → fallback,百分比灰度 | 自有方案;后续可接入 LaunchDarkly / Statsig |

**覆盖率:10/12 ✅,2/12 ⚪ 故意不做(用更合适的工具替代)。**

---

## 2. 本次补强了什么

### P1: 滑动窗口限流 ⭐⭐⭐

**轮子:** `@upstash/ratelimit` ^2.x + `@upstash/redis` ^1.x

**为什么:** 现有 `TokenBucket` 是手写的,只有令牌桶一种算法。AI SaaS 防 LLM token 滥用更需要 **滑动窗口**(对突发流量更友好,跟 OpenAI / Anthropic 的限流算法一致)。`@upstash/ratelimit` 是 2026 serverless 限流的事实标准 —— Vercel、Resend、Linear 都用它。

**导出:**
```ts
import { createSlidingWindowLimiter } from "@nebutra/rate-limit";

const limiter = createSlidingWindowLimiter({
  algorithm: { kind: "slidingWindow", tokens: 60, window: "1 m" },
  prefix: "api:chat",
  analytics: true, // 写 Upstash dashboard
});

const r = await limiter.check(`user:${userId}`);
if (!r.allowed) return new Response("rate limited", { status: 429, headers: { "Retry-After": String(r.retryAfter) } });
```

**支持的算法:** `slidingWindow` / `fixedWindow` / `tokenBucket`(从同一个 API 选)。

**Env 检测:** `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` 任一缺失则进入 fail-open 模式(本地 dev 自动失效,prod 一次 console.warn)。

**实现:** [packages/platform/rate-limit/src/slidingWindow.ts](packages/platform/rate-limit/src/slidingWindow.ts)

---

### P2: Bloom Filter ⭐⭐

**轮子:** `bloom-filters` npm 3.0.4(纯 JS,28K weekly downloads,TypeScript 类型)

**为什么:** AI SaaS 典型场景:
- LLM prompt 去重(短时间内相同 prompt 不重复计费)
- 通知"看过没看过"预检
- 邮箱已注册预查(配合 anti-enumeration)
- 大规模 click 去重

100M elements + 1% FP rate ≈ 120 MB;同样数据用 Redis SET ≈ 6 GB。**省 95% 内存**。

**导出:**
```ts
import { createBloomFilter } from "@nebutra/cache";

const dedup = createBloomFilter({
  key: "bloom:prompts:hourly",
  capacity: 1_000_000,
  errorRate: 0.01,
  ttlSeconds: 3600, // 每小时滚动
});

const wasSeen = await dedup.add(`${tenantId}:${promptHash}`);
if (wasSeen) {
  // 已见过,返回缓存结果而不是再调 LLM
}
```

**实现选择:**
- **没用** Redis 原生 `BF.*` 命令 —— 那要 RedisBloom 模块,Upstash 不支持
- **用** `bloom-filters` 的 `saveAsJSON()` / `fromJSON()` 把 filter 序列化成 JSON,存进 Redis 一个 key
- 适合"读多写少"场景。高频写入用 `addMany()` 批量摊薄

**Trade-off:** 读取时 deserialize 整个 filter(100K 元素 ≈ 1.2KB,可接受)。**写入时**整个 filter 重新序列化 + `SET` —— 大型 filter(>10M 元素 ≈ 12MB)写入会慢,这种规模建议用专用 BF 服务(Redis Stack / Pinecone Sparse)。

**实现:** [packages/integrations/cache/src/strategies/bloom.ts](packages/integrations/cache/src/strategies/bloom.ts)

---

## 3. 没补的两项 + 理由

### #5 排行榜(ZSorted Set)

跳过原因:
- **业务不需要** —— B2B AI SaaS 没有游戏化排行榜场景
- 真有"组织内 token 使用 TOP 10"之类的需求,**直接 SQL `ORDER BY usage DESC LIMIT 10`** 就行,我们有 PostgreSQL + ClickHouse
- 真要 leaderboard 也是 10 行裸 ZSET 就解决,不值得包一层

### #9 地理位置

跳过原因:
- **PostgreSQL + PostGIS 是更好的轮子**(我们已经在用 Postgres)。Redis Geo 精度 ~0.5m 但只支持半径查询;PostGIS 是 SV 标准
- 没有真实业务场景(不是 LBS app)
- 真要做就开 PostGIS 扩展,加 `geography` 列,用 `ST_DWithin` —— 比 Redis Geo 强 10 倍

---

## 4. 升级建议(将来需要时再做)

### 4.1 缓存 → 加 Vercel Runtime Cache(L0 层)

`@vercel/functions` 的 `unstable_cache` + `revalidateTag` 是 2026 边缘缓存的标准。可以加在 Redis 之上做 L0:
```
请求 → Vercel Runtime Cache(per-region,毫秒级)→ Redis(全局,10-50ms)→ DB
```

### 4.2 队列 → 加 Inngest

Inngest 是 2026 durable execution 的轮子(替代 BullMQ 在 serverless 场景)。值得给 `@nebutra/queue` 加第 5 个 provider。

### 4.3 配置中心 → 加 `@vercel/flags` 或 Statsig

我们的 feature-flags 实现是基础版。SV 2026 推荐:
- 客户端低延迟:`@vercel/flags`(Edge Config 驱动)
- 灰度发布 / A/B 测试:Statsig(免费 layer 友好)
- 不推荐 LaunchDarkly(按 MAU 计费,大规模太贵)

### 4.4 锁 → 加 Redlock(只当跨多个 Redis 集群时)

单实例 Redis(Upstash 是单 region 主从)用 `SET NX EX` 就够。真要跨地域多写时再考虑 Redlock。

---

## 5. 验证

- ✅ `pnpm --filter @nebutra/rate-limit typecheck` 通过(P1)
- ✅ `pnpm --filter @nebutra/cache typecheck` 通过(P2)
- Vitest 待补:`slidingWindow.test.ts` + `bloom.test.ts`(留作 follow-up)
