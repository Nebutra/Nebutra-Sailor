<div align="right">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | <strong>日本語</strong>
</div>

<div align="center">
  <a href="https://nebutra.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" />
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-horizontal-en.svg" />
      <img alt="{{brand.name}}" src="packages/design/brand/assets/logo/logo-horizontal-en.svg" width="320" />
    </picture>
  </a>
  <br />
  <br />
  <h3>オープンソース AI ネイティブ SaaS プラットフォーム基盤</h3>
  <p><em>AI ゲートウェイ、課金、認証、コンプライアンス、ホワイトラベル提供のためのガバナンス可能なマルチテナント基盤。</em></p>
  <br />
  <p>
    <a href="https://nebutra.com"><strong>公式サイト</strong></a> · 
    <a href="#概要"><strong>概要</strong></a> · 
    <a href="#技術スタック"><strong>技術スタック</strong></a> · 
    <a href="#クイックスタート"><strong>クイックスタート</strong></a> · 
    <a href="#コントリビュート"><strong>貢献</strong></a>
  </p>
  <p>
    <a href="https://github.com/{{repo.full}}/stargazers">
      <img src="https://img.shields.io/github/stars/{{repo.full}}?style=for-the-badge&logo=github&color=6366f1&logoColor=fff" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/{{repo.full}}/network/members">
      <img src="https://img.shields.io/github/forks/{{repo.full}}?style=for-the-badge&logo=github&color=14b8a6&logoColor=fff" alt="GitHub Forks" />
    </a>
    <a href="https://github.com/{{repo.full}}/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/ライセンス-AGPLv3-6366f1?style=for-the-badge" alt="License" />
    </a>
  </p>
  <p>
    <a href="https://securityscorecards.dev/viewer/?uri=github.com/{{repo.full}}">
      <img src="https://api.securityscorecards.dev/projects/github.com/{{repo.full}}/badge" alt="OpenSSF Scorecard" />
    </a>
    <a href="https://socket.dev/npm/package/nebutra">
      <img src="https://socket.dev/api/badge/npm/package/nebutra" alt="Socket Security" />
    </a>
    <a href="https://www.npmjs.com/package/nebutra">
      <img src="https://img.shields.io/npm/v/nebutra?label=nebutra&color=cb3837&logo=npm" alt="npm: nebutra" />
    </a>
    <a href="https://www.npmjs.com/package/create-sailor">
      <img src="https://img.shields.io/npm/v/create-sailor?label=create-sailor&color=cb3837&logo=npm" alt="npm: create-sailor" />
    </a>
  </p>
</div>

<br />
<br />

> **ライセンス概要** —— npm で公開されているパッケージはすべて **AGPL-3.0-only** です。
> `npm install @nebutra/*` をネットワーク経由のプロダクトに使う場合、
> AGPL のネットワーク Copyleft 条項が発動します — ただし (a)
> `npx create-sailor` でスキャフォールドするか（Independent Developer
> License、≤ 1 FTE & < $1M ARR で無料、**Copyleft なし**）、
> (b) [LICENSE-COMMERCIAL.md](./LICENSE-COMMERCIAL.md) の Startup
> ($799/年) または Enterprise 商用ライセンスを取得した場合は除きます。
> 完全な対応表とエッジケースは下記の [License](#license) セクションと
> [docs/legal/licensing-faq.md](docs/legal/licensing-faq.md) を参照してください。

> **30 秒で起動** —— SaaS の API キーは一切不要:
> ```bash
> npx create-sailor@latest my-app --preset=minimal --yes
> cd my-app && pnpm dev   # → http://localhost:3000
> ```
> `minimal` プリセットは `apps/web` + IAM + ローカル Postgres
> のみを生成し、ゴールデンパスをローカル DB で起動できるようにします。
> Stripe / Clerk / Resend などは後から `nebutra add <provider>`
> で追加できます。

<br />

## 概要

{{brand.name}} Sailor は、ガバナンス可能なモダンなマルチテナントプラットフォームを構築するための、エンタープライズグレードの AI ネイティブ SaaS モノレポアーキテクチャです。AI ゲートウェイ、エージェントワークフロー、課金、認証、コンプライアンス、ホワイトラベル提供のための実用的な基盤を提供します。

Next.js 16、React 19、Prisma 7、Vercel AI SDK で構築され、AI をガバナンスが必要なランタイム能力として扱います。プロバイダートポロジー、モデルルーティング、可観測性、テナント分離、コンプライアンスフックがプラットフォーム基盤に含まれます。

### このプロジェクトの作り手

{{repo.name}} は **{{company.name}}**（{{company.nameCN}}）によってメンテナンスされています。日々のエンジニアリング責任者は **Tseka Luk**（[@tsekaluk](https://github.com/tsekaluk) · `legal@nebutra.com`）。本プロジェクトはデュアルライセンスモデルを採用しており、ソロファウンダーや OPC が Copyleft の制約を受けずに商用プロダクトを構築できる一方、企業のフォークはコミュニティへの還元義務を負います — 詳細は下記の [License](#license) セクションをご覧ください。

`@nebutra/*` の npm スコープに加え、`nebutra` と `create-sailor` の 2 つの CLI を公開しています。リリースは [changesets](https://github.com/changesets/changesets) で駆動され、手動の `workflow_dispatch` をリリースゲートとしています。各リリースで SBOM 認証を生成します（[release.yml](.github/workflows/release.yml) 参照）。セキュリティ報告は [SECURITY.md](SECURITY.md) へ、商用 / ライセンスに関する問い合わせは `legal@nebutra.com` までどうぞ。

### 会社について

<div align="center">
<h4>{{brand.name}} Intelligence</h4>
  <sub>無錫雲毓智能科技有限公司</sub>
  <br /><br />
  <p>
    ガバナンス可能なプロダクト基盤を構築する AI ネイティブインフラ企業<br />
    マルチテナント SaaS、エージェントワークフロー、ローンチ運用、グローバル提供を支えます
  </p>
  <p align="center">長期的な堀はスターターではなく、変化し続ける AI 能力をガバナンス可能で出荷できるシステムに変える力です。</p>
</div>

> AI はデモの構築を助けます。Sailor はより難しい本番レイヤー、つまりガバナンス、セキュリティ、アーキテクチャ、スケーラビリティ、収益運用に焦点を当てます。
>
> 目的はウィザードでプロバイダーを一つずつ選ぶことではありません。プロバイダー、リージョン、テナント、コンプライアンス境界をまたいで進化できる AI トポロジーを運用することです。

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
  <strong>プラットフォームガバナンス</strong><br />
  <sub>トポロジー · 契約 · CI</sub>
</td>
<td align="center" width="25%">
  <h3>🦄</h3>
  <strong>ローンチ基盤</strong><br />
  <sub>認証 · 課金 · AI ゲートウェイ</sub>
</td>
</tr>
</table>
</div>

#### マニフェスト

- 加速度の時代に技術的な壁は長く続かない。真の堀は、継続的な想像力、トレンドへの鋭い感度、素早いエラー修正、そして誰より速くアイデアを現実にする実行力。
- 保守的な選択は一見安全だが、実はより攻めの賭けだ。変わらないことは世界が変わらないと賭けること。唯一の不変は変化。

### なぜ Sailor を選ぶのか？

**ガバナンス可能な AI ネイティブプロダクトのために**：Sailor は「AI がデモを作った」と「運用、監査、課金、拡張ができるプロダクト基盤」の間のギャップを埋めます。

<table>
<tr>
<td width="50%">

|     | 特徴               | 説明                             |
| :-: | :----------------- | :------------------------------- |
| 🚀  | **本番環境対応**   | エンタープライズ実証済みパターン |
| 🤖  | **AI ネイティブ**  | LLM・Embeddings・RAG・MCP Agent  |
| 🏢  | **マルチテナント** | RLS・テナント分離・カスタマイズ  |
| ⚡  | **モダンスタック** | Next.js 16・React 19・TypeScript 5.9 |
| 💳  | **課金機能内蔵**   | Stripe・使用量計測・機能権限     |

</td>
<td width="50%">

|     | 特徴                       | 説明                            |
| :-: | :------------------------- | :------------------------------ |
| 📋  | **法務・コンプライアンス** | GDPR/CCPA・Cookie 同意          |
| 🔐  | **セキュリティ優先**       | WAF・RLS・プロンプト注入制御    |
| 🌍  | **グローバル対応**         | i18n・CDN・エッジキャッシュ     |
| 👤  | **運用対応**               | マルチエージェント・自動化 CI/CD |
| 🚢  | **ローンチ対応**           | デモ → プロダクト → 収益        |

</td>
</tr>
</table>

## ハイライト

<table>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/ai.svg" width="28" alt="AI" /><br />
      <strong>AI ネイティブ</strong>
      <br />LLM、ベクトル検索、MCPエージェント、および高品質な Lobe UI チャット体験。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/tenants.svg" width="28" alt="Tenants" /><br />
      <strong>マルチテナント標準</strong>
      <br />テナントコンテキスト、RLS、スコープ付きキャッシュ・レート制限を標準搭載。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/enterprise.svg" width="28" alt="Enterprise" /><br />
      <strong>エンタープライズ対応</strong>
      <br />Cloudflare WAF/R2、Inngest ワークフロー、Sentry/Otel、Vercel デプロイ。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/workflows.svg" width="28" alt="Workflows" /><br />
      <strong>課金・収益化</strong>
      <br />DB 駆動プラン、Stripe 課金、使用量計測、機能ゲート。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/security.svg" width="28" alt="Security" /><br />
      <strong>セキュリティ・コンプライアンス</strong>
      <br />RLS、WAF、Turnstile、GDPR/CCPA、Cookie 同意。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/toolkit.svg" width="28" alt="Toolkit" /><br />
      <strong>マーケティング UI キット</strong>
      <br />Hero、Features、Pricing、Testimonials — コンバージョン最適化コンポーネント。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/enterprise.svg" width="28" alt="Architecture" /><br />
      <strong>自動化されたガバナンス</strong>
      <br /><code>vitest.arch</code>による境界テストと厳格なセマンティックトークン検証。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/toolkit.svg" width="28" alt="CSS" /><br />
      <strong>ゼロランタイム CSS</strong>
      <br />CSS 変数を SSOT とし、CSS-in-JS のオーバーヘッドを完全排除。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/workflows.svg" width="28" alt="Docker" /><br />
      <strong>モジュラーなローカル DX</strong>
      <br />Docker プロファイルにより、必要なマイクロサービスのみを起動。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/ai.svg" width="28" alt="AI Agent" /><br />
      <strong>収益化可能な MCP ゲートウェイ</strong>
      <br />サブスクリプションに基づく Model Context Protocol のアクセス制御と監査。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/security.svg" width="28" alt="Saga" /><br />
      <strong>分散型 Saga トランザクション</strong>
      <br />トランザクション失敗時の自動補償メカニズムを備えたオーケストレーター。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/tenants.svg" width="28" alt="Event Bus" /><br />
      <strong>マルチテナント・バス</strong>
      <br /><code>tenantId</code> による厳密な分離と、非同期・同期パターン標準サポート。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/workflows.svg" width="28" alt="Monitoring" /><br />
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
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white&v=1" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white&v=1" alt="Tailwind" /></a>
  <a href="https://storybook.js.org/"><img src="https://img.shields.io/badge/Storybook_8-FF4785?style=flat-square&logo=storybook&logoColor=white&v=1" alt="Storybook" /></a>
</td>
</tr>
<tr>
<td><strong>UI / デザイン</strong></td>
<td>
  <a href="https://www.radix-ui.com/"><img src="https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radix-ui&logoColor=white" alt="Radix UI" /></a>
  <img src="https://img.shields.io/badge/HeroUI-000?style=flat-square" alt="HeroUI" />
  <img src="https://img.shields.io/badge/Lobe_UI-000?style=flat-square&logo=react&logoColor=white&v=1" alt="Lobe UI" />
  <img src="https://img.shields.io/badge/Geist_Icons_(541)-000?style=flat-square" alt="Geist Icons" />
  <img src="https://img.shields.io/badge/Inter-000?style=flat-square&logo=googlefonts&logoColor=white&v=1" alt="Inter" />
  <img src="https://img.shields.io/badge/JetBrains_Mono-000?style=flat-square&logo=jetbrains&logoColor=white&v=1" alt="JetBrains Mono" />
  <img src="https://img.shields.io/badge/W3C_DTCG_トークン-gray?style=flat-square" alt="DTCG Tokens" />
</td>
</tr>
<tr>
<td><strong>認証</strong></td>
<td>
  <a href="https://clerk.com/"><img src="https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white&v=1" alt="Clerk" /></a>
  <a href="https://www.better-auth.com/"><img src="https://img.shields.io/badge/Better_Auth-000?style=flat-square" alt="Better Auth" /></a>
  <a href="https://authjs.dev/"><img src="https://img.shields.io/badge/Auth.js-000?style=flat-square&logo=next.js&logoColor=white&v=1" alt="Auth.js" /></a>
  <img src="https://img.shields.io/badge/OIDC_プロバイダー-gray?style=flat-square" alt="OIDC" />
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
<td><strong>バックエンド (Python)</strong></td>
<td>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white&v=1" alt="FastAPI" /></a>
  <a href="https://www.uvicorn.org/"><img src="https://img.shields.io/badge/Uvicorn-499848?style=flat-square" alt="Uvicorn" /></a>
  <a href="https://docs.pydantic.dev/"><img src="https://img.shields.io/badge/Pydantic_v2-E92063?style=flat-square&logo=pydantic&logoColor=white&v=1" alt="Pydantic" /></a>
  <img src="https://img.shields.io/badge/Python_3.11+-3776AB?style=flat-square&logo=python&logoColor=white&v=1" alt="Python" />
</td>
</tr>
<tr>
<td><strong>データベース</strong></td>
<td>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white&v=1" alt="Supabase" /></a>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white&v=1" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white&v=1" alt="pgvector" />
  <a href="https://clickhouse.com/"><img src="https://img.shields.io/badge/ClickHouse-FFCC01?style=flat-square&logo=clickhouse&logoColor=black&v=1" alt="ClickHouse" /></a>
  <img src="https://img.shields.io/badge/リアルタイム-gray?style=flat-square" alt="Realtime" />
  <img src="https://img.shields.io/badge/RLS-gray?style=flat-square" alt="RLS" />
</td>
</tr>
<tr>
<td><strong>キャッシュ / レート制限</strong></td>
<td>
  <a href="https://upstash.com/"><img src="https://img.shields.io/badge/Upstash_Redis-00E9A3?style=flat-square&logo=redis&logoColor=white&v=1" alt="Upstash" /></a>
  <img src="https://img.shields.io/badge/スライディングウィンドウ-gray?style=flat-square" alt="Sliding Window" />
  <img src="https://img.shields.io/badge/トークンバケット-gray?style=flat-square" alt="Token Bucket" />
</td>
</tr>
<tr>
<td><strong>リアルタイム</strong></td>
<td>
  <a href="https://pusher.com/"><img src="https://img.shields.io/badge/Pusher-300D4F?style=flat-square&logo=pusher&logoColor=white&v=1" alt="Pusher" /></a>
  <a href="https://soketi.app/"><img src="https://img.shields.io/badge/Soketi-4F46E5?style=flat-square" alt="Soketi" /></a>
  <img src="https://img.shields.io/badge/Supabase_Realtime-3ECF8E?style=flat-square" alt="Supabase Realtime" />
</td>
</tr>
<tr>
<td><strong>AI</strong></td>
<td>
  <a href="https://sdk.vercel.ai/"><img src="https://img.shields.io/badge/Vercel_AI_SDK_5-black?style=flat-square&logo=vercel" alt="Vercel AI" /></a>
  <a href="https://vercel.com/ai-gateway"><img src="https://img.shields.io/badge/AI_Gateway-black?style=flat-square&logo=vercel" alt="AI Gateway" /></a>
  <a href="https://openrouter.ai/"><img src="https://img.shields.io/badge/OpenRouter-6366F1?style=flat-square" alt="OpenRouter" /></a>
  <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white&v=1" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Anthropic-191919?style=flat-square&logo=anthropic&logoColor=white&v=1" alt="Anthropic" />
  <img src="https://img.shields.io/badge/Google_AI-4285F4?style=flat-square&logo=google&logoColor=white&v=1" alt="Google AI" />
  <img src="https://img.shields.io/badge/DeepSeek-1E40AF?style=flat-square" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/Moonshot-000000?style=flat-square" alt="Moonshot" />
  <img src="https://img.shields.io/badge/MCP-black?style=flat-square" alt="MCP" />
  <img src="https://img.shields.io/badge/30+_プロバイダー-475569?style=flat-square" alt="30+ providers" />
</td>
</tr>
<tr>
<td><strong>検索</strong></td>
<td>
  <a href="https://www.meilisearch.com/"><img src="https://img.shields.io/badge/Meilisearch-FF5CAA?style=flat-square&logo=meilisearch&logoColor=white&v=1" alt="Meilisearch" /></a>
  <a href="https://typesense.org/"><img src="https://img.shields.io/badge/Typesense-DA1A60?style=flat-square&logo=typesense&logoColor=white&v=1" alt="Typesense" /></a>
  <a href="https://www.algolia.com/"><img src="https://img.shields.io/badge/Algolia-003DFF?style=flat-square&logo=algolia&logoColor=white&v=1" alt="Algolia" /></a>
</td>
</tr>
<tr>
<td><strong>キュー</strong></td>
<td>
  <a href="https://upstash.com/qstash"><img src="https://img.shields.io/badge/QStash-00E9A3?style=flat-square&logo=upstash&logoColor=white&v=1" alt="QStash" /></a>
  <a href="https://docs.bullmq.io/"><img src="https://img.shields.io/badge/BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white&v=1" alt="BullMQ" /></a>
</td>
</tr>
<tr>
<td><strong>ストレージ / アップロード</strong></td>
<td>
  <a href="https://www.cloudflare.com/products/r2/"><img src="https://img.shields.io/badge/Cloudflare_R2-F38020?style=flat-square&logo=cloudflare&logoColor=white&v=1" alt="R2" /></a>
  <a href="https://aws.amazon.com/s3/"><img src="https://img.shields.io/badge/AWS_S3-569A31?style=flat-square&logo=amazons3&logoColor=white&v=1" alt="S3" /></a>
  <a href="https://vercel.com/docs/storage/vercel-blob"><img src="https://img.shields.io/badge/Vercel_Blob-black?style=flat-square&logo=vercel" alt="Vercel Blob" /></a>
  <img src="https://img.shields.io/badge/マルチパート-gray?style=flat-square" alt="Multipart" />
  <img src="https://img.shields.io/badge/署名付き_URL-gray?style=flat-square" alt="Presigned URLs" />
</td>
</tr>
<tr>
<td><strong>通知</strong></td>
<td>
  <a href="https://novu.co/"><img src="https://img.shields.io/badge/Novu-4F46E5?style=flat-square" alt="Novu" /></a>
  <img src="https://img.shields.io/badge/アプリ内-gray?style=flat-square" alt="In-app" />
  <img src="https://img.shields.io/badge/メール-gray?style=flat-square" alt="Email" />
  <img src="https://img.shields.io/badge/プッシュ-gray?style=flat-square" alt="Push" />
  <img src="https://img.shields.io/badge/SMS-gray?style=flat-square" alt="SMS" />
</td>
</tr>
<tr>
<td><strong>Webhook</strong></td>
<td>
  <a href="https://www.svix.com/"><img src="https://img.shields.io/badge/Svix-1F2937?style=flat-square" alt="Svix" /></a>
  <img src="https://img.shields.io/badge/HMAC_署名-gray?style=flat-square" alt="HMAC" />
  <img src="https://img.shields.io/badge/リトライ_+_DLQ-gray?style=flat-square" alt="Retry + DLQ" />
</td>
</tr>
<tr>
<td><strong>SMS (中国)</strong></td>
<td>
  <img src="https://img.shields.io/badge/Aliyun_SMS-FF6A00?style=flat-square&logo=alibabacloud&logoColor=white&v=1" alt="Aliyun" />
  <img src="https://img.shields.io/badge/Tencent_Cloud-006EFF?style=flat-square&logo=tencentqq&logoColor=white&v=1" alt="Tencent" />
</td>
</tr>
<tr>
<td><strong>決済</strong></td>
<td>
  <a href="https://stripe.com/"><img src="https://img.shields.io/badge/Stripe-008CDD?style=flat-square&logo=stripe&logoColor=white&v=1" alt="Stripe" /></a>
  <img src="https://img.shields.io/badge/利用量計測-gray?style=flat-square" alt="Metering" />
  <img src="https://img.shields.io/badge/エンタイトルメント-gray?style=flat-square" alt="Entitlements" />
</td>
</tr>
<tr>
<td><strong>メール</strong></td>
<td>
  <a href="https://resend.com/"><img src="https://img.shields.io/badge/Resend-black?style=flat-square&logo=resend&logoColor=white&v=1" alt="Resend" /></a>
  <a href="https://react.email/"><img src="https://img.shields.io/badge/React_Email-61DAFB?style=flat-square&logo=react&logoColor=black&v=1" alt="React Email" /></a>
</td>
</tr>
<tr>
<td><strong>CMS / ドキュメント</strong></td>
<td>
  <a href="https://www.sanity.io/"><img src="https://img.shields.io/badge/Sanity_Studio_v4-F03E2F?style=flat-square&logo=sanity&logoColor=white&v=1" alt="Sanity" /></a>
  <a href="https://fumadocs.vercel.app/"><img src="https://img.shields.io/badge/Fumadocs-000?style=flat-square" alt="Fumadocs" /></a>
  <a href="https://mintlify.com/"><img src="https://img.shields.io/badge/Mintlify-1D40AF?style=flat-square" alt="Mintlify" /></a>
</td>
</tr>
<tr>
<td><strong>デザイン同期</strong></td>
<td>
  <a href="https://figma.com/"><img src="https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white&v=1" alt="Figma" /></a>
  <a href="https://penpot.app/"><img src="https://img.shields.io/badge/Penpot-1A1A1A?style=flat-square" alt="Penpot" /></a>
</td>
</tr>
<tr>
<td><strong>CDN / セキュリティ</strong></td>
<td>
  <a href="https://cloudflare.com/"><img src="https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white&v=1" alt="Cloudflare" /></a>
  <img src="https://img.shields.io/badge/WAF-gray?style=flat-square" alt="WAF" />
  <img src="https://img.shields.io/badge/Turnstile-gray?style=flat-square" alt="Turnstile" />
  <img src="https://img.shields.io/badge/CASL_権限-gray?style=flat-square" alt="CASL" />
  <img src="https://img.shields.io/badge/KMS_Vault-gray?style=flat-square" alt="Vault" />
</td>
</tr>
<tr>
<td><strong>ワークフロー</strong></td>
<td>
  <a href="https://www.inngest.com/"><img src="https://img.shields.io/badge/Inngest-6366F1?style=flat-square" alt="Inngest" /></a>
  <a href="https://n8n.io/"><img src="https://img.shields.io/badge/n8n-EA4B71?style=flat-square&logo=n8n&logoColor=white&v=1" alt="n8n" /></a>
  <img src="https://img.shields.io/badge/Saga_オーケストレーター-gray?style=flat-square" alt="Saga" />
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
<td><strong>可観測性</strong></td>
<td>
  <a href="https://sentry.io/"><img src="https://img.shields.io/badge/Sentry-362D59?style=flat-square&logo=sentry&logoColor=white&v=1" alt="Sentry" /></a>
  <a href="https://opentelemetry.io/"><img src="https://img.shields.io/badge/OpenTelemetry-425CC7?style=flat-square&logo=opentelemetry&logoColor=white&v=1" alt="OpenTelemetry" /></a>
  <a href="https://www.openstatus.dev/"><img src="https://img.shields.io/badge/OpenStatus-000?style=flat-square" alt="OpenStatus" /></a>
</td>
</tr>
<tr>
<td><strong>ビルド / デプロイ</strong></td>
<td>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-black?style=flat-square&logo=vercel" alt="Vercel" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white&v=1" alt="Turborepo" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm_10-F69220?style=flat-square&logo=pnpm&logoColor=white&v=1" alt="pnpm" /></a>
  <a href="https://biomejs.dev/"><img src="https://img.shields.io/badge/Biome-60A5FA?style=flat-square&logo=biome&logoColor=white&v=1" alt="Biome" /></a>
</td>
</tr>
</table>

<br />

## プラットフォーム機能

Sailor は **プロバイダー非依存** です。以下の各プラットフォームパッケージは環境変数からバックエンドを自動検出するため、アプリケーションコードを変更せずにプロバイダーを切り替えられます。各パッケージはテスト用の in-memory 実装と、[tests/architecture/](tests/architecture/) のアーキテクチャテストで強制される厳格な TypeScript 契約を備えています。

<table>
<tr><th>機能</th><th>パッケージ</th><th>プロバイダー（自動検出）</th></tr>
<tr><td>認証</td><td><code>@nebutra/auth</code></td><td>Clerk · Better Auth · Auth.js</td></tr>
<tr><td>アイデンティティプロバイダー</td><td><code>@nebutra/oauth-server</code></td><td>OIDC (oidc-provider) · Redis セッション</td></tr>
<tr><td>権限</td><td><code>@nebutra/permissions</code></td><td>CASL — RBAC + ABAC、Hono ミドルウェア、React <code>&lt;Can /&gt;</code></td></tr>
<tr><td>マルチテナント</td><td><code>@nebutra/tenant</code></td><td>AsyncLocalStorage コンテキスト · Prisma RLS ブリッジ</td></tr>
<tr><td>キャプチャ</td><td><code>@nebutra/captcha</code></td><td>Cloudflare Turnstile</td></tr>
<tr><td>Vault（シークレット）</td><td><code>@nebutra/vault</code></td><td>AWS KMS エンベロープ · ローカル HKDF（開発用）</td></tr>
<tr><td>監査ログ</td><td><code>@nebutra/audit</code></td><td>追記専用ハッシュチェーン</td></tr>
<tr><td>キャッシュ</td><td><code>@nebutra/cache</code></td><td>Upstash Redis · in-memory</td></tr>
<tr><td>レート制限</td><td><code>@nebutra/rate-limit</code></td><td>スライディングウィンドウ · トークンバケット (Upstash)</td></tr>
<tr><td>キュー</td><td><code>@nebutra/queue</code></td><td>QStash · BullMQ · in-memory</td></tr>
<tr><td>検索</td><td><code>@nebutra/search</code></td><td>Meilisearch · Typesense · Algolia</td></tr>
<tr><td>ストレージ / アップロード</td><td><code>@nebutra/uploads</code></td><td>Cloudflare R2 · AWS S3 · Vercel Blob · ローカル FS</td></tr>
<tr><td>通知</td><td><code>@nebutra/notifications</code></td><td>Novu — アプリ内 · メール · プッシュ · SMS · チャット</td></tr>
<tr><td>Webhook</td><td><code>@nebutra/webhooks</code></td><td>Svix · カスタム HMAC 配信</td></tr>
<tr><td>SMS（中国）</td><td><code>@nebutra/sms</code></td><td>Aliyun · Tencent Cloud</td></tr>
<tr><td>メール</td><td><code>@nebutra/email</code></td><td>Resend + React Email テンプレート</td></tr>
<tr><td>請求</td><td><code>@nebutra/billing</code></td><td>Stripe — サブスクリプション、利用量、エンタイトルメント</td></tr>
<tr><td>利用量計測</td><td><code>@nebutra/metering</code></td><td>ClickHouse リアルタイム集計</td></tr>
<tr><td>イベントバス</td><td><code>@nebutra/event-bus</code></td><td>マルチテナント Pub/Sub · ファンアウト · Request-Reply</td></tr>
<tr><td>Saga オーケストレーター</td><td><code>@nebutra/saga</code></td><td>自動ロールバック補償付きの TS ワークフロー</td></tr>
<tr><td>機能フラグ</td><td><code>@nebutra/feature-flags</code></td><td>DB ベース + 環境変数オーバーライド</td></tr>
<tr><td>デザイントークン</td><td><code>@nebutra/design-sync</code></td><td>W3C DTCG ↔ Figma · Penpot · git-only</td></tr>
<tr><td>ステータス集約</td><td><code>@nebutra/status</code></td><td>OpenStatus · Atlassian StatusPage</td></tr>
</table>

<br />

## CLI と公式サイト

### npm から CLI を使う

新規プロジェクトでは、モノレポ全体を clone して削るのではなく、npm から開始できます。

```bash
# 新しい Sailor プロジェクトを作成
npx create-sailor@latest
npm create sailor@latest
pnpm create sailor@latest
bunx create-sailor@latest

# 既存の Sailor プロジェクトを運用
npx nebutra --help
npm install -g nebutra
```

| パッケージ | 用途 |
| ---------- | ---- |
| [`create-sailor`](https://www.npmjs.com/package/create-sailor) | リージョン対応のデフォルト値とトポロジー優先の AI ゲートウェイ設定で、新しい {{brand.name}} Sailor プロジェクトを作成します。 |
| [`nebutra`](https://www.npmjs.com/package/nebutra) | 既存プロジェクトを運用します。機能レジストリの追加、AI プロバイダーガバナンス、ゲートウェイルーティング、Schema、診断に使います。 |

### nebutra.com

[`nebutra.com`](https://nebutra.com) は {{brand.name}} Sailor の公開プロダクト入口であり、私たち自身がこのプラットフォームを dogfooding する場所です。今後のプロダクト更新、商用ライセンス、ホステッド機能、ローンチワークフロー、このモノレポで構築した実例は公式サイトで継続的に公開します。

<br />

## クイックスタート

### 必要環境

| ツール  | バージョン                                |
| ------- | ----------------------------------------- |
| Node.js | `v22+`                                    |
| pnpm    | `v10.32+`                                 |
| Python  | `3.11+` <sub>（マイクロサービス用）</sub> |

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/{{repo.full}}.git
cd {{repo.name}}

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
{{repo.name}}/
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
│   ├── agents/            # Vercel AI SDK ラッパー、エージェント、ストリーミング補助
│   ├── ai-providers/      # マルチプロバイダー AI レジストリとメタデータ
│   ├── billing/           # Stripe 課金、プラン、使用量計測
│   ├── brand/             # ブランドアセット、ガイドライン
│   ├── preset/            # 機能ベースのテンプレート設定
│   ├── theme/             # グローバルテーマトークン & CSS 変数
│   ├── ui/                # Radix + HeroUI + Lobe UI コンポーネント
│   ├── icons/             # Geist アイコンライブラリ
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
| **バグ報告**       | [Issue を作成](https://github.com/{{repo.full}}/issues) |
| **機能リクエスト** | Issue で提案                                                     |
| **プルリクエスト** | 機能追加やバグ修正の PR を送信                                   |

<br />

## バージョン管理とリリース運用

公開中のすべてのパッケージは公開 API が安定するまで **0.x の範囲**にあります。
[SemVer §4](https://semver.org/lang/ja/#spec-item-4) に従い、メジャーバージョンが
ゼロである契約は **0.x のいずれのリリースも破壊的変更を含む可能性がある**
ことを意味します — 本番環境では `"nebutra": "0.3.1"` のように厳密な
バージョンに固定し、caret 範囲は使わないでください。1.0 を切るまでは
このポリシーが続きます。

- バージョン管理は [changesets](https://github.com/changesets/changesets) によって駆動されます。公開対象パッケージに触れる PR は `.changeset/*.md` を含めて patch/minor/major を宣言する必要があります — CI でこのゲートを強制しています。
- 各パッケージの `CHANGELOG.md` は `changeset version` が生成し、バージョンアップと同じコミットでコミットされます（例: [`packages/ops/cli/CHANGELOG.md`](packages/ops/cli/CHANGELOG.md)）。
- リリースワークフローは **手動**（`workflow_dispatch`）です — PR マージで突然リリースされることはありません。関連する変更をまとめて一括でリリースを切ります。
- 1.0 前のメジャー API 変更（例: CLI コマンドの改名、パッケージ分類）は最初に **release candidate** を発行します: `nebutra@0.4.0-rc.0` を `next` dist-tag に乗せ、1 週間以上の soak テストを経てから `latest` に昇格させます。RC のインストール: `npm i nebutra@next`。
- npm 公開には **provenance attestation** が付与されます（npm レジストリ側で trusted-publishing が有効化された時点で。ワークフロー側はすでに準備済み — [`release.yml`](.github/workflows/release.yml) の `NPM_CONFIG_PROVENANCE: "true"` 参照）。公開済み tarball の検証: `npm view <pkg> --json | jq .dist.attestations`。

**API 安定**のシグナルとして `1.0.0` をリリースします。それまでは現行サーフェスを
「形は本番対応、細部は進化中」とお考えください。

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
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" width="100">
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-mono.svg" width="100">
      <img alt="{{brand.name}}" src="packages/design/brand/assets/logo/logo-mono.svg" width="100">
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
