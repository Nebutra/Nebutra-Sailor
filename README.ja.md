<div align="right">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | <strong>日本語</strong>
</div>

<div align="center">
  <a href="https://nebutra.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/brand/assets/logo/logo-inverse.svg" />
      <source media="(prefers-color-scheme: light)" srcset="packages/brand/assets/logo/logo-horizontal-en.svg" />
      <img alt="Nebutra" src="packages/brand/assets/logo/logo-horizontal-en.svg" width="320" />
    </picture>
  </a>
  <br />
  <br />
  <h3>オープンソース エンタープライズ SaaS プラットフォーム</h3>
  <p><em>起業の成長を民主化・知能化・軽量化し、最後は計測可能でトレース可能に。</em></p>
  <br />
  <p>
    <a href="https://nebutra.com"><strong>公式サイト</strong></a> · 
    <a href="#概要"><strong>概要</strong></a> · 
    <a href="#技術スタック"><strong>技術スタック</strong></a> · 
    <a href="#クイックスタート"><strong>クイックスタート</strong></a> · 
    <a href="#コントリビュート"><strong>貢献</strong></a>
  </p>
  <p>
    <a href="https://github.com/Nebutra/Nebutra-Sailor/stargazers">
      <img src="https://img.shields.io/github/stars/Nebutra/Nebutra-Sailor?style=for-the-badge&logo=github&color=6366f1&logoColor=fff" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/Nebutra/Nebutra-Sailor/network/members">
      <img src="https://img.shields.io/github/forks/Nebutra/Nebutra-Sailor?style=for-the-badge&logo=github&color=14b8a6&logoColor=fff" alt="GitHub Forks" />
    </a>
    <a href="https://github.com/Nebutra/Nebutra-Sailor/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/ライセンス-AGPLv3-6366f1?style=for-the-badge" alt="License" />
    </a>
  </p>
</div>

<br />
<br />

## 概要

Nebutra Sailor は、モダンなマルチテナントプラットフォームを構築するための、エンタープライズグレードの AI ネイティブ SaaS モノレポアーキテクチャです。コンテンツコミュニティ、レコメンドシステム、EC 連携、Web3 アプリケーションのための、実戦で検証された基盤を提供します。

Next.js 16、React 19、Prisma 7 など最新技術で構築され、LLM、ベクトル検索、インテリジェントワークフローをネイティブサポートする「AI ファースト」の思想を体現しています。

### 会社について

<div align="center">
<h4>Nebutra Intelligence</h4>
  <sub>無錫雲毓智能科技有限公司（Wuxi Yunyu Intelligent Technology Co., Ltd.）</sub>
  <br /><br />
  <p>
    次世代ユニコーンプロダクトの創出に取り組む AI ネイティブスタートアップ<br />
    <strong>Vibe Business</strong> を先駆け — Vibe Coding から Vibe 起業へ
  </p>
  <p align="center">技術は複製でき、製品は模倣される。変化への深い理解こそ、唯一信頼できる堀だ。</p>
</div>

> **Vibe Coding** は「作る」問題を解決し、**Vibe Business** は「稼ぐ」問題を解決する。
>
> 0 から 90 は簡単—AI がコードを書く。本当の挑戦は残りの 10%：セキュリティ、アーキテクチャ、スケーラビリティ、そしてデモを収益を生むプロダクトにすること。
>
> **グロースハック** × **AI ネイティブ**：データ駆動の実験、バイラルループ、コンバージョン最適化—インテリジェントオートメーションで加速。

<br />

<div align="center">
<table>
<tr>
<td align="center" width="25%">
  <h3>🚀</h3>
  <strong>グローバル化</strong><br />
  <sub>Day 1 から世界市場へ</sub>
</td>
<td align="center" width="25%">
  <h3>🤖</h3>
  <strong>AI ネイティブ</strong><br />
  <sub>LLM · Multi-Agent · MCP</sub>
</td>
<td align="center" width="25%">
  <h3>💼</h3>
  <strong>Vibe Business</strong><br />
  <sub>Demo → 収益 · 高速出荷</sub>
</td>
<td align="center" width="25%">
  <h3>🦄</h3>
  <strong>ユニコーン創出</strong><br />
  <sub>一人会社 Ready</sub>
</td>
</tr>
</table>
</div>

#### マニフェスト

- 加速度の時代に技術的な壁は長く続かない。真の堀は、継続的な想像力、トレンドへの鋭い感度、素早いエラー修正、そして誰より速くアイデアを現実にする実行力。
- 保守的な選択は一見安全だが、実はより攻めの賭けだ。変わらないことは世界が変わらないと賭けること。唯一の不変は変化。

### なぜ Sailor を選ぶのか？

**Vibe Business 時代のために**：Sailor は「AI で作れる」と「収益を生むプロダクトを出荷できる」のギャップを埋める。

#### 🗡️ 4つのコアDXベクター (The 4 DX Vectors)

1. **⚡️ 異次元の初期化体験 (Init DX)**：クローンしてコードを探して置換する面倒な作業から解放されます。`npx create-sailor` を実行すると、対話型CLIが自動的に不要なパッケージを物理的に削除（Prune）し、コードベースをあなたの要件に完全フィットさせた状態で `.env.local` と共にセットアップします。
2. **🌍 グローバルネイティブ (Global DX)**：初日から世界市場に向けて。`next-intl` に深く統合されたダイナミックルーティングにより、言語分離の壁を最初から用意。単一のコードベースのまま、Edge Middleware を通じて海外決済と国内決済を同時に受け入れる基盤が初日から稼働します。
3. **💰 収益に直結するコンバージョンキット (Revenue DX)**：エンジニアに必要なのはCRUD機能だけではなく、トラフィックを顧客に変える武器です。偽の待機人数を表示する FOMO 搭載の Waitlist、コンバージョン特化の Pricing Table、そしてパスワードレスの Magic Link メールなどを `@nebutra/marketing` として標準装備。
4. **🏢 スケールを約束するエンタープライズ基盤 (Scale DX)**：一人の開発者から始まり、将来100人のエンジニアチームに成長しても耐えうるアーキテクチャ。Turborepoのマイクロフロントエンド、Changesetsのバージョン管理、そして要件ごとにデータを隔離する Prisma Multi-Schema により、「すべて書き直し」という悪夢を完全に葬り去ります。

<table>
<tr>
<td width="50%">

|     | 特徴               | 説明                             |
| :-: | :----------------- | :------------------------------- |
| 🚀  | **本番環境対応**   | エンタープライズ実証済みパターン |
| 🤖  | **AI ネイティブ**  | LLM・Embeddings・RAG・MCP Agent  |
| 🏢  | **マルチテナント** | RLS・テナント分離・カスタマイズ  |
| ⚡  | **モダンスタック** | Next.js 16・React 19・TS 5.6+    |
| 💳  | **課金機能内蔵**   | Stripe・使用量計測・機能権限     |

</td>
<td width="50%">

|     | 特徴                       | 説明                            |
| :-: | :------------------------- | :------------------------------ |
| 📋  | **法務・コンプライアンス** | GDPR/CCPA・Cookie 同意          |
| 🔐  | **セキュリティ優先**       | WAF・RLS・Prompt Injection 防御 |
| 🌍  | **グローバル対応**         | i18n・CDN・エッジキャッシュ     |
| 👤  | **一人会社 Ready**         | Multi-Agent・自動化 CI/CD       |
| 🦄  | **ユニコーン志向**         | Demo → プロダクト → 収益        |

</td>
</tr>
</table>

## ハイライト

<table>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/ai.svg" width="28" alt="AI" /><br />
      <strong>AI ネイティブ</strong>
      <br />LLM、ベクトル検索、MCPエージェント、および高品質な Lobe UI チャット体験。
    </td>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/tenants.svg" width="28" alt="Tenants" /><br />
      <strong>マルチテナント標準</strong>
      <br />テナントコンテキスト、RLS、スコープ付きキャッシュ・レート制限を標準搭載。
    </td>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/enterprise.svg" width="28" alt="Enterprise" /><br />
      <strong>エンタープライズ対応</strong>
      <br />Cloudflare WAF/R2、Inngest ワークフロー、Sentry/Otel、Vercel デプロイ。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/workflows.svg" width="28" alt="Workflows" /><br />
      <strong>課金・収益化</strong>
      <br />DB 駆動プラン、Stripe 課金、使用量計測、機能ゲート。
    </td>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/security.svg" width="28" alt="Security" /><br />
      <strong>セキュリティ・コンプライアンス</strong>
      <br />RLS、WAF、Turnstile、GDPR/CCPA、Cookie 同意。
    </td>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/toolkit.svg" width="28" alt="Toolkit" /><br />
      <strong>マーケティング UI キット</strong>
      <br />Hero、Features、Pricing、Testimonials — コンバージョン最適化コンポーネント。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/enterprise.svg" width="28" alt="Architecture" /><br />
      <strong>自動化されたガバナンス</strong>
      <br /><code>vitest.arch</code>による境界テストと厳格なセマンティックトークン検証。
    </td>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/toolkit.svg" width="28" alt="CSS" /><br />
      <strong>ゼロランタイム CSS</strong>
      <br />CSS 変数を SSOT とし、CSS-in-JS のオーバーヘッドを完全排除。
    </td>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/workflows.svg" width="28" alt="Docker" /><br />
      <strong>モジュラーなローカル DX</strong>
      <br />Docker プロファイルにより、必要なマイクロサービスのみを起動。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/ai.svg" width="28" alt="AI Agent" /><br />
      <strong>収益化可能な MCP ゲートウェイ</strong>
      <br />サブスクリプションに基づく Model Context Protocol のアクセス制御と監査。
    </td>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/security.svg" width="28" alt="Saga" /><br />
      <strong>分散型 Saga トランザクション</strong>
      <br />トランザクション失敗時の自動補償メカニズムを備えたオーケストレーター。
    </td>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/tenants.svg" width="28" alt="Event Bus" /><br />
      <strong>マルチテナント・バス</strong>
      <br /><code>tenantId</code> による厳密な分離と、非同期・同期パターン標準サポート。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/brand/assets/icons/workflows.svg" width="28" alt="Monitoring" /><br />
      <strong>統合ステータス集約</strong>
      <br />9つのコンポーネントを並行チェックし、OpenStatus と Atlassian 向けの標準化メトリクスを返却。
    </td>
    <td width="33%" valign="top"></td>
    <td width="33%" valign="top"></td>
  </tr>
</table>

<br />

## 技術スタック

<table>
<tr>
<td><strong>フロントエンド</strong></td>
<td>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js_17-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white&v=1" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white&v=1" alt="Tailwind" /></a>
</td>
</tr>
<tr>
<td><strong>UI / デザイン</strong></td>
<td>
  <a href="https://primer.style/react"><img src="https://img.shields.io/badge/Primer-24292F?style=flat-square&logo=github&logoColor=white&v=1" alt="Primer" /></a>
  <a href="https://primer.style/octicons"><img src="https://img.shields.io/badge/Octicons-24292F?style=flat-square&logo=github&logoColor=white&v=1" alt="Octicons" /></a>
  <img src="https://img.shields.io/badge/Lobe_UI-000?style=flat-square&logo=react&logoColor=white&v=1" alt="Lobe UI" />
  <img src="https://img.shields.io/badge/Lobe_Icons-000?style=flat-square" alt="Lobe Icons" />
  <img src="https://img.shields.io/badge/Inter-000?style=flat-square&logo=googlefonts&logoColor=white&v=1" alt="Inter" />
  <img src="https://img.shields.io/badge/JetBrains_Mono-000?style=flat-square&logo=jetbrains&logoColor=white&v=1" alt="JetBrains Mono" />
  <img src="https://img.shields.io/badge/デザイントークン-gray?style=flat-square" alt="Design Tokens" />
</td>
</tr>
<tr>
<td><strong>認証</strong></td>
<td>
  <a href="https://clerk.com/"><img src="https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white&v=1" alt="Clerk" /></a>
  <img src="https://img.shields.io/badge/マルチテナント組織-gray?style=flat-square" alt="Multi-tenant" />
</td>
</tr>
<tr>
<td><strong>BFF</strong></td>
<td>
  <a href="https://hono.dev/"><img src="https://img.shields.io/badge/Hono-E36002?style=flat-square&logo=hono&logoColor=white&v=1" alt="Hono" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma_7-2D3748?style=flat-square&logo=prisma&logoColor=white&v=1" alt="Prisma" /></a>
  <a href="https://zod.dev/"><img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white&v=1" alt="Zod" /></a>
</td>
</tr>
<tr>
<td><strong>データベース</strong></td>
<td>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white&v=1" alt="Supabase" /></a>
  <img src="https://img.shields.io/badge/pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white&v=1" alt="pgvector" />
  <img src="https://img.shields.io/badge/リアルタイム-gray?style=flat-square" alt="Realtime" />
  <img src="https://img.shields.io/badge/RLS-gray?style=flat-square" alt="RLS" />
</td>
</tr>
<tr>
<td><strong>キャッシュ</strong></td>
<td>
  <a href="https://upstash.com/"><img src="https://img.shields.io/badge/Upstash_Redis-00E9A3?style=flat-square&logo=redis&logoColor=white&v=1" alt="Upstash" /></a>
  <img src="https://img.shields.io/badge/レート制限-gray?style=flat-square" alt="Rate Limiting" />
</td>
</tr>
<tr>
<td><strong>リアルタイム</strong></td>
<td>
  <a href="https://pusher.com/"><img src="https://img.shields.io/badge/Pusher-300D4F?style=flat-square&logo=pusher&logoColor=white&v=1" alt="Pusher" /></a>
  <a href="https://soketi.app/"><img src="https://img.shields.io/badge/Soketi-4F46E5?style=flat-square" alt="Soketi" /></a>
  <img src="https://img.shields.io/badge/プレゼンスチャンネル-gray?style=flat-square" alt="Presence" />
  <img src="https://img.shields.io/badge/プライベートチャンネル-gray?style=flat-square" alt="Private Channels" />
</td>
</tr>
<tr>
<td><strong>AI</strong></td>
<td>
  <a href="https://sdk.vercel.ai/"><img src="https://img.shields.io/badge/Vercel_AI_SDK-black?style=flat-square&logo=vercel" alt="Vercel AI" /></a>
  <a href="https://openrouter.ai/"><img src="https://img.shields.io/badge/OpenRouter-6366F1?style=flat-square" alt="OpenRouter" /></a>
  <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white&v=1" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Anthropic-191919?style=flat-square&logo=anthropic&logoColor=white&v=1" alt="Anthropic" />
  <img src="https://img.shields.io/badge/Google_AI-4285F4?style=flat-square&logo=google&logoColor=white&v=1" alt="Google AI" />
  <img src="https://img.shields.io/badge/SiliconFlow-6366F1?style=flat-square" alt="SiliconFlow" />
</td>
</tr>
<tr>
<td><strong>決済</strong></td>
<td>
  <a href="https://stripe.com/"><img src="https://img.shields.io/badge/Stripe-008CDD?style=flat-square&logo=stripe&logoColor=white&v=1" alt="Stripe" /></a>
</td>
</tr>
<tr>
<td><strong>メール</strong></td>
<td>
  <a href="https://resend.com/"><img src="https://img.shields.io/badge/Resend-black?style=flat-square&logo=resend&logoColor=white&v=1" alt="Resend" /></a>
</td>
</tr>
<tr>
<td><strong>CMS</strong></td>
<td>
  <a href="https://sanity.io/"><img src="https://img.shields.io/badge/Sanity-F03E2F?style=flat-square&logo=sanity&logoColor=white&v=1" alt="Sanity" /></a>
</td>
</tr>
<tr>
<td><strong>CDN / セキュリティ</strong></td>
<td>
  <a href="https://cloudflare.com/"><img src="https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white&v=1" alt="Cloudflare" /></a>
  <img src="https://img.shields.io/badge/WAF-gray?style=flat-square" alt="WAF" />
  <img src="https://img.shields.io/badge/R2_Storage-gray?style=flat-square" alt="R2" />
  <img src="https://img.shields.io/badge/Turnstile-gray?style=flat-square" alt="Turnstile" />
</td>
</tr>
<tr>
<td><strong>ワークフロー</strong></td>
<td>
  <a href="https://inngest.com/"><img src="https://img.shields.io/badge/Inngest-6366F1?style=flat-square" alt="Inngest" /></a>
  <a href="https://n8n.io/"><img src="https://img.shields.io/badge/n8n-EA4B71?style=flat-square&logo=n8n&logoColor=white&v=1" alt="n8n" /></a>
</td>
</tr>
<tr>
<td><strong>アナリティクス</strong></td>
<td>
  <a href="https://dub.co/"><img src="https://img.shields.io/badge/Dub-000000?style=flat-square" alt="Dub" /></a>
  <img src="https://img.shields.io/badge/リンク帰属-gray?style=flat-square" alt="Link Attribution" />
  <img src="https://img.shields.io/badge/コンバージョン-gray?style=flat-square" alt="Conversions" />
</td>
</tr>
<tr>
<td><strong>オブザーバビリティ</strong></td>
<td>
  <a href="https://sentry.io/"><img src="https://img.shields.io/badge/Sentry-362D59?style=flat-square&logo=sentry&logoColor=white&v=1" alt="Sentry" /></a>
  <a href="https://opentelemetry.io/"><img src="https://img.shields.io/badge/OpenTelemetry-425CC7?style=flat-square&logo=opentelemetry&logoColor=white&v=1" alt="OpenTelemetry" /></a>
</td>
</tr>
<tr>
<td><strong>デプロイ</strong></td>
<td>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-black?style=flat-square&logo=vercel" alt="Vercel" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white&v=1" alt="Turborepo" /></a>
</td>
</tr>
</table>

<br />

## クイックスタート

### 必要環境

| ツール  | バージョン                                |
| ------- | ----------------------------------------- |
| Node.js | `v20+`                                    |
| pnpm    | `v9+`                                     |
| Python  | `3.11+` <sub>（マイクロサービス用）</sub> |

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/Nebutra/Nebutra-Sailor.git
cd Nebutra-Sailor

# 依存関係をインストール
pnpm install

# 環境変数を設定
cp .env.example .env

# Prisma クライアント生成 & 開発サーバー起動
pnpm db:generate && pnpm dev
```

### コマンド一覧

| コマンド         | 説明                       |
| ---------------- | -------------------------- |
| `pnpm dev`       | 全アプリを開発モードで起動 |
| `pnpm build`     | 全パッケージをビルド       |
| `pnpm lint`      | リント実行                 |
| `pnpm typecheck` | 型チェック                 |
| `pnpm db:studio` | Prisma Studio を開く       |

<br />

## プロジェクト構成

```
Nebutra-Sailor/
├── apps/
│   ├── landing-page/      # マーケティングサイト
│   ├── web/               # メイン SaaS ダッシュボード
│   ├── studio/            # Sanity CMS
│   ├── api-gateway/       # BFF レイヤー
│   ├── design-docs/       # コンポーネントドキュメント (Fumadocs)
│   ├── docs/              # Mintlify ドキュメントサイト
│   ├── idp/               # アイデンティティプロバイダー
│   └── storybook/         # コンポーネント Playground
├── packages/
│   ├── create-sailor/     # CLI スキャフォールド (npx create-sailor)
│   ├── i18n/              # next-intl ルーティング & ロケール管理
│   ├── marketing/         # 高コンバージョン UI (Waitlist, Pricing, FAQ)
│   ├── email/             # トランザクションメール (Magic Link, Resend)
│   ├── ai-sdk/            # Vercel AI SDK ラッパー
│   ├── ai-providers/      # マルチプロバイダー AI SDK
│   ├── billing/           # Stripe 課金、プラン、使用量計測
│   ├── brand/             # ブランドアセット、ガイドライン
│   ├── design-system/     # デザイントークン、テーマ
│   ├── theme/             # グローバルテーマトークン & CSS 変数
│   ├── ui/                # Lobe UI + Lobe Icons + デザインシステム
│   ├── icons/             # アイコンライブラリ
│   ├── identity/          # 認証ヘルパー & テナント ID
│   ├── contracts/         # 共有 TypeScript 型 & Zod スキーマ
│   ├── legal/             # Cookie 同意、プライバシー、GDPR/CCPA
│   ├── db/                # Prisma 7 スキーマ & クライアント
│   ├── cache/             # Redis キャッシュ戦略
│   ├── rate-limit/        # マルチテナントレート制限
│   ├── mcp/               # AI エージェント用 Model Context Protocol
│   ├── logger/            # 構造化ロギング
│   └── ...                # その他多数
├── services/
│   ├── ai/                # Python FastAPI - LLM、Embeddings
│   ├── billing/           # 課金マイクロサービス
│   ├── content/           # Python FastAPI - 投稿、フィード
│   ├── recsys/            # Python - レコメンドエンジン
│   ├── ecommerce/         # Python - Shopify/Shopline 連携
│   ├── event-ingest/      # イベント取り込みパイプライン
│   └── web3/              # Python - ブロックチェーンインデクサー
└── infra/                 # インフラ設定
```

<br />

## コントリビュート

コントリビューションを歓迎します！

|                    |                                                                  |
| ------------------ | ---------------------------------------------------------------- |
| **バグ報告**       | [Issue を作成](https://github.com/Nebutra/Nebutra-Sailor/issues) |
| **機能リクエスト** | Issue で提案                                                     |
| **プルリクエスト** | 機能追加やバグ修正の PR を送信                                   |

<br />

## ライセンス

**AGPLv3**

|              |                                        |
| ------------ | -------------------------------------- |
| **無料利用** | 個人プロジェクト、学習、社内ツール     |
| **変更可能** | 派生物の作成                           |
| **配布可能** | 帰属表示付きで                         |
| **商用利用** | オープンソース化が必要                 |
| **免除**     | 無錫雲毓智能科技有限公司および関連会社 |

<br />

---

<br />

<div align="center">
  <a href="https://nebutra.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/brand/assets/logo/logo-inverse.svg" width="100">
      <source media="(prefers-color-scheme: light)" srcset="packages/brand/assets/logo/logo-mono.svg" width="100">
      <img alt="Nebutra" src="packages/brand/assets/logo/logo-mono.svg" width="100">
    </picture>
  </a>
  <br />
  <br />
  <sub>
<strong>すべてのリリースで、成長が稼働する。</strong>
  </sub>
  <br />
  <br />
  <sub>© 2024-現在 <strong>無錫雲毓智能科技有限公司</strong></sub>
</div>
