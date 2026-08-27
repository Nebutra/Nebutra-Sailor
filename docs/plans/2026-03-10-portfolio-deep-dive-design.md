# Portfolio Deep Dive — Design Doc

> **Goal:** 为每个项目创建详情页，展示架构图 + 指标面板 + 深度叙事 + 图片，提升议价权。

**Approved scope:** 中间路线 — 比卡片深一层，但不是产品发布页。

---

## 1. 站点架构变更

### 新增路由：`/work/[slug]`

动态路由，静态生成（`generateStaticParams`），每个项目一页。

### 页面结构（3 个区块）

```
┌──────────────────────────────────────┐
│  顶部：项目名 + tagline + 指标面板    │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 93% │ │ 68p │ │ 20K │ │ 70% │   │
│  │保留率│ │页/分 │ │ 页  │ │降本 │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
├──────────────────────────────────────┤
│  中间：架构图 + 1-2 段深度描述        │
│                                      │
│  ┌────────────────────────────┐      │
│  │   Mermaid 架构图 (SVG)     │      │
│  └────────────────────────────┘      │
│                                      │
│  两段叙事文字，讲故事带数字           │
├──────────────────────────────────────┤
│  底部：技术栈 + 图片 + 链接          │
│  [Python] [Qwen-VL] [DeepSeek]      │
│  ┌──────┐ ┌──────┐                  │
│  │ 证书 │ │ 截图 │  [GitHub] [Demo] │
│  └──────┘ └──────┘                  │
└──────────────────────────────────────┘
```

### 设计约束

- 统一设计语言（`--color-accent` 系列，不搞项目专属配色）
- AnimateIn 滚动触发入场
- 卡片网格保留作为索引，卡片点击跳详情页
- 响应式：移动端单列，桌面端正常布局
- 不搞分段式叙事（Problem/Approach/Impact），就是自然讲故事

---

## 2. 数据结构升级

### projects.ts 扩展

```typescript
export interface Project {
  slug: string;
  name: string;
  tagline: string;
  description: string;       // 卡片简述
  tags: string[];
  icon: string;
  metric?: string;
  url?: string;
  github?: string;
  status: "live" | "building" | "shipped";
  // 新增
  highlights?: { value: string; label: string }[];  // 指标面板，3-4 个
  architecture?: string;     // Mermaid 图代码
  story?: string;            // 详情页深度叙事（1-2 段）
  images?: string[];         // 项目相关图片路径
}
```

### 卡片网格变更

- ProjectCard 包裹在 `<Link href={`/work/${project.slug}`}>` 内
- 鼠标 hover 显示 "查看详情" 提示

---

## 3. 新增项目（基于全盘扫描）

优先级排序（最值钱的先做）：

### Tier 1：必须上（高含金量 + 有数字）

| slug | 名称 | 核心指标 | 值钱思路 |
|------|------|---------|---------|
| ocr-auto | OCR-Auto | 100% bbox · 50 元素 | 生产级 AI 标注系统，不是脚本 |
| tiktok-pipeline | TikTok Visual Search | 31 轮迭代 · 7 维标注 | 多模态 pipeline 工程能力 |
| mlbb-analysis | MLBB Video Analysis | 460x 加速 · 95% | 自动化 vs 人工的数量级差距 |

### Tier 2：值得上（丰富维度）

| slug | 名称 | 核心指标 | 值钱思路 |
|------|------|---------|---------|
| synapse-quant | Synapse-Quant | 5 微服务 · K8s | 全栈量化系统，不是玩具 bot |
| hm3d-eval | HM3D 3D Scene Eval | 4.62/5 · 1000 场景 | 数据质量评估专业能力 |
| douxing-tea | 斗星茶叶 ERP | 6 万字 · 7 表 · RLS | 完整业务系统，不是 CRUD demo |

### 已有项目保持不变

any2md, low-altitude-economy, nebutra-sailor, mcm-icm, biomass-modeling, pet-industry, cursor-export, brand-strategy, mineru-skill, warehouse-drone, cdtmp, hydrogem-web, next-unicorn

---

## 4. Skill 升级

portfolio-miner skill 从"读文件写一句话"升级为：

```
每个项目的挖掘流程：
1. 遍历项目目录所有源文件
2. 提取架构信息 → 生成 Mermaid 代码
3. 提取所有可量化指标 → highlights 数组
4. 撰写 story 字段（1-2 段深度叙事）
5. 搜索匹配的证书/截图 → images 数组
6. 输出完整 Project 对象
```

Source 覆盖整个 ~/Documents/：
- 简历/ — 奖项、证书、项目五要素
- Appen/ — 数据标注项目
- GitHub/ — 开源项目
- 实验性项目/ — Synapse-Quant、douxing-tea 等
- 无锡云毓智能科技有限公司/ — 公司文档
- Obsidian-Repo/ — 策略、产品笔记
- 2025电赛/ — 电子设计竞赛

---

## 5. 图片策略

| 来源 | 目标路径 | 处理 |
|------|---------|------|
| 个人荣誉/*.jpg | public/images/awards/ | 压缩到 <200KB |
| 项目截图（手动截取） | public/images/projects/[slug]/ | 16:9 裁剪 |
| 架构图（Mermaid 生成） | 内联 SVG 或编译时生成 | 不需要文件 |

---

## 6. 技术选型

| 需求 | 方案 |
|------|------|
| Mermaid 渲染 | `mermaid` 包 + 编译时 SVG 生成，或 `<pre>` + 客户端渲染 |
| 详情页路由 | `app/work/[slug]/page.tsx` + `generateStaticParams` |
| 图片优化 | Next.js `<Image>` + sharp 压缩 |
| 动画 | AnimateIn（已有），不引入新库 |

---

## 7. 不做的事

- ❌ 项目专属配色
- ❌ 6 段分段叙事（Problem/Approach/Breakthrough...）
- ❌ 动画数字 count-up（过度设计）
- ❌ 图片画廊 lightbox
- ❌ MDX 内容系统（直接用 TSX + 数据驱动）
