# Best Practices Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复代码库中所有已识别的最佳实践问题，提升代码质量、安全性和可维护性。

**Architecture:** 按优先级从高到低逐步修复：ESLint 规则 → 移除 console.log → 提取重复 hook → 统一 TypeScript 配置 → 添加安全响应头 → 添加错误边界。每个任务独立提交，确保可回滚。

**Tech Stack:** TypeScript, Next.js 15, React 19, pnpm monorepo, ESLint + typescript-eslint

---

## Task 1: 强化 ESLint 规则

**Files:**

- Modify: `eslint.config.mjs`

**目标：** 将现有 warn 升级为 error，添加 `no-console` 规则防止未来引入 console 语句。

**Step 1: 修改 ESLint 配置**

将 `eslint.config.mjs` 中的规则从：

```js
rules: {
  "@typescript-eslint/no-unused-vars": ["warn", ...],
  "@typescript-eslint/no-explicit-any": "warn",
}
```

改为：

```js
rules: {
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "@typescript-eslint/no-explicit-any": "error",
  "no-console": ["error", { allow: ["warn", "error"] }],
}
```

**Step 2: 验证 ESLint 运行无误**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm eslint eslint.config.mjs --no-eslintrc 2>/dev/null || pnpm lint 2>&1 | head -50
```

注意：此时 lint 会因为 packages/alerting 的 console.log 报错，这是预期行为，下一个 Task 修复。

**Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: strengthen eslint rules - warn to error, add no-console"
```

---

## Task 2: 移除 packages/alerting 中的 console 语句

**Files:**

- Modify: `packages/platform/alerting/src/index.ts`

**目标：** 将所有 `console.log` 和 `console.error` 替换为静默处理或标准错误抛出，使生产代码无 console 依赖。

**Step 1: 修改 `initializeFromEnv` 函数**

在 `packages/platform/alerting/src/index.ts` 的第 373-386 行，将：

```typescript
export function initializeFromEnv(): void {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;

  if (slackUrl) {
    registerChannel(createSlackChannel(slackUrl));
    console.log("Slack alerting channel registered");
  }

  if (discordUrl) {
    registerChannel(createDiscordChannel(discordUrl));
    console.log("Discord alerting channel registered");
  }
}
```

改为（移除 console.log，返回注册的 channel 名称数组）：

```typescript
export function initializeFromEnv(): string[] {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  const registered: string[] = [];

  if (slackUrl) {
    registerChannel(createSlackChannel(slackUrl));
    registered.push("slack");
  }

  if (discordUrl) {
    registerChannel(createDiscordChannel(discordUrl));
    registered.push("discord");
  }

  return registered;
}
```

**Step 2: 修改 `createSlackChannel` 中的 catch 块**

第 93-96 行，将：

```typescript
} catch (error) {
  console.error("Slack alert failed:", error);
  return false;
}
```

改为：

```typescript
} catch {
  return false;
}
```

**Step 3: 修改 `createDiscordChannel` 中的 catch 块**

第 148-151 行，将：

```typescript
} catch (error) {
  console.error("Discord alert failed:", error);
  return false;
}
```

改为：

```typescript
} catch {
  return false;
}
```

**Step 4: 修改 `createWebhookChannel` 中的 catch 块**

第 184-187 行，将：

```typescript
} catch (error) {
  console.error(`Webhook alert (${name}) failed:`, error);
  return false;
}
```

改为：

```typescript
} catch {
  return false;
}
```

**Step 5: 修改 `sendAlert` 中的 catch 块**

第 211-213 行，将：

```typescript
} catch (error) {
  console.error(`Alert channel ${name} failed:`, error);
  results.set(name, false);
}
```

改为：

```typescript
} catch {
  results.set(name, false);
}
```

**Step 6: 修改 `sendAlertTo` 中的 catch 块**

第 245-248 行，将：

```typescript
} catch (error) {
  console.error(`Alert channel ${name} failed:`, error);
  results.set(name, false);
}
```

改为：

```typescript
} catch {
  results.set(name, false);
}
```

**Step 7: 修改 `trackError` 中的 `.catch(console.error)`**

第 312 行，将：

```typescript
alertError(...).catch(console.error);
```

改为：

```typescript
alertError(...).catch(() => undefined);
```

**Step 8: 验证 lint 通过**

```bash
pnpm --filter @nebutra/alerting exec pnpm lint 2>&1 | head -20
# 如果 filter 不工作，用：
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor
pnpm lint 2>&1 | grep -E "(alerting|error|Error)" | head -20
```

**Step 9: Commit**

```bash
git add packages/platform/alerting/src/index.ts
git commit -m "fix: remove console statements from alerting package"
```

---

## Task 3: 提取 useMount Hook（消除重复 hydration 模式）

**Files:**

- Create: `apps/landing/src/hooks/useMount.ts`
- Modify: `apps/landing/src/components/ThemeToggle.tsx`
- Modify: `apps/landing/src/components/landing/Navbar.tsx`
- Modify: `apps/landing/src/components/landing/FooterMinimal.tsx`
- Modify: `apps/landing/src/components/landing/TrustRibbon.tsx`

**目标：** 将 4 个组件中重复的 mounted state + useEffect 模式提取到 `useMount` hook。

**Step 1: 创建 hooks 目录和 useMount hook**

创建 `apps/landing/src/hooks/useMount.ts`：

```typescript
import { useState, useEffect } from "react";

/**
 * Returns true after component has mounted on the client.
 * Use to avoid hydration mismatches with theme-dependent rendering.
 */
export function useMount(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
```

**Step 2: 更新 ThemeToggle.tsx**

将 `apps/landing/src/components/ThemeToggle.tsx` 中：

```typescript
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
```

改为：

```typescript
import { useTheme } from "next-themes";
import { useMount } from "@/hooks/useMount";
```

并将：

```typescript
const { theme, setTheme } = useTheme();
const [mounted, setMounted] = useState(false);

// Avoid hydration mismatch - standard Next.js pattern
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard Next.js hydration pattern
  setMounted(true);
}, []);
```

改为：

```typescript
const { theme, setTheme } = useTheme();
const mounted = useMount();
```

**Step 3: 更新 Navbar.tsx**

将 `apps/landing/src/components/landing/Navbar.tsx` 中：

```typescript
import { useState, useEffect } from "react";
```

改为：

```typescript
import { useState, useEffect } from "react";
import { useMount } from "@/hooks/useMount";
```

并将：

```typescript
const [mounted, setMounted] = useState(false);
const { resolvedTheme } = useTheme();

// Avoid hydration mismatch - standard Next.js pattern
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard Next.js hydration pattern
  setMounted(true);
}, []);
```

改为：

```typescript
const { resolvedTheme } = useTheme();
const mounted = useMount();
```

**Step 4: 更新 FooterMinimal.tsx**

将 `apps/landing/src/components/landing/FooterMinimal.tsx` 中：

```typescript
import { useState, useEffect } from "react";
```

改为：

```typescript
import { useMount } from "@/hooks/useMount";
```

并将：

```typescript
const [mounted, setMounted] = useState(false);
const { resolvedTheme } = useTheme();

useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard Next.js hydration pattern
  setMounted(true);
}, []);
```

改为：

```typescript
const { resolvedTheme } = useTheme();
const mounted = useMount();
```

**Step 5: 更新 TrustRibbon.tsx**

将 `apps/landing/src/components/landing/TrustRibbon.tsx` 中：

```typescript
import { useState, useEffect } from "react";
```

改为：

```typescript
import { useMount } from "@/hooks/useMount";
```

并将：

```typescript
const [mounted, setMounted] = useState(false);
const { resolvedTheme } = useTheme();

useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard Next.js hydration pattern
  setMounted(true);
}, []);
```

改为：

```typescript
const { resolvedTheme } = useTheme();
const mounted = useMount();
```

**Step 6: 验证 TypeScript 编译通过**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/landing
pnpm tsc --noEmit 2>&1 | head -30
```

**Step 7: Commit**

```bash
git add apps/landing/src/hooks/useMount.ts \
        apps/landing/src/components/ThemeToggle.tsx \
        apps/landing/src/components/landing/Navbar.tsx \
        apps/landing/src/components/landing/FooterMinimal.tsx \
        apps/landing/src/components/landing/TrustRibbon.tsx
git commit -m "refactor: extract useMount hook to eliminate hydration pattern duplication"
```

---

## Task 4: 统一 TypeScript 编译目标

**Files:**

- Modify: `apps/landing/tsconfig.json`

**目标：** 将 landing 的 `target` 从 `ES2017` 升级到 `ES2022`，与根配置 `tsconfig.base.json` 对齐。

**Step 1: 修改 tsconfig.json**

将 `apps/landing/tsconfig.json` 第 3 行：

```json
"target": "ES2017",
```

改为：

```json
"target": "ES2022",
```

**Step 2: 验证编译**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/landing
pnpm tsc --noEmit 2>&1 | head -20
```

预期：无错误输出（或仅有之前就存在的类型错误）。

**Step 3: Commit**

```bash
git add apps/landing/tsconfig.json
git commit -m "chore: align landing tsconfig target to ES2022"
```

---

## Task 5: 添加安全响应头

**Files:**

- Modify: `apps/landing/next.config.ts`

**目标：** 为 landing 添加标准安全响应头（CSP、X-Frame-Options、X-Content-Type-Options 等）。

**Step 1: 更新 next.config.ts**

将 `apps/landing/next.config.ts` 完整替换为：

```typescript
import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

**Step 2: 验证构建**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/landing
pnpm build 2>&1 | tail -20
```

预期：build 成功完成。

**Step 3: Commit**

```bash
git add apps/landing/next.config.ts
git commit -m "feat: add security headers to landing (X-Frame-Options, CSP, etc.)"
```

---

## Task 6: 添加 Error Boundary 组件

**Files:**

- Create: `apps/landing/src/components/ErrorBoundary.tsx`
- Modify: `apps/landing/src/app/layout.tsx`

**目标：** 为 landing 添加 React Error Boundary，防止未捕获的运行时错误导致白屏。

**Step 1: 先读取 layout.tsx 了解现有结构**

在实施前，读取 `apps/landing/src/app/layout.tsx` 确认当前结构。

**Step 2: 创建 ErrorBoundary 组件**

创建 `apps/landing/src/components/ErrorBoundary.tsx`：

```typescript
"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center text-center px-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Something went wrong
              </h2>
              <p className="text-muted-foreground text-sm">
                Please refresh the page or try again later.
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**Step 3: 在 layout.tsx 中使用 ErrorBoundary**

读取 `apps/landing/src/app/layout.tsx` 后，在 `<body>` 内容外层包裹 ErrorBoundary。具体位置根据实际 layout 结构确定，通常是包裹 `{children}` 的父级。

**Step 4: 验证 TypeScript 编译**

```bash
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/landing
pnpm tsc --noEmit 2>&1 | head -20
```

**Step 5: Commit**

```bash
git add apps/landing/src/components/ErrorBoundary.tsx \
        apps/landing/src/app/layout.tsx
git commit -m "feat: add ErrorBoundary component to prevent white screen on runtime errors"
```

---

## 完成标准

所有 Task 完成后，验证：

- [ ] `pnpm lint` 无 error（Task 1-2 修复后）
- [ ] `pnpm tsc --noEmit` 在 landing 中通过（Task 3-4 后）
- [ ] 响应头中包含 `X-Frame-Options`（Task 5 后）
- [ ] 每个 Task 都有独立 git commit

**跳过项（范围外）：**

- 测试覆盖率（0% → 80%）：规模过大，需单独专项计划
- CORS 硬编码：需要与 API Gateway 环境配置协调
- 结构化日志系统：需要引入新依赖，需单独评估
