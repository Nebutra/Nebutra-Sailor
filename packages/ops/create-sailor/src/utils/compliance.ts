import fs from "node:fs";
import path from "node:path";

/**
 * Compliance template bundle for create-sailor.
 *
 * This is a KEY differentiator — few SaaS templates have Chinese compliance
 * (PIPL / 网信办 AIGC 新规 / ICP + 公安备案) built-in alongside GDPR.
 *
 * Regions:
 *  - "global" : GDPR/CCPA baseline — cookie banner + privacy + terms
 *  - "cn"     : Adds PIPL + AIGC disclaimer + ICP/PSB footers + PII list + cross-border
 *  - "hybrid" : Both — for SaaS serving both markets
 *
 * Placeholders (replaced by brand-apply step, NOT here):
 *   {{COMPANY_NAME}}, {{COMPANY_ADDRESS}}, {{COMPANY_CONTACT_EMAIL}}
 *
 * Silent-skip: if `apps/web` is absent (future headless variant), we no-op.
 */

export type ComplianceRegion = "global" | "cn" | "hybrid";

const WEB_APP_REL = path.join("apps", "web");
const COMPONENTS_REL = path.join("src", "components", "compliance");
const LOCALE_APP_REL = path.join("src", "app", "[locale]");

function webAppDir(targetDir: string): string {
  return path.join(targetDir, WEB_APP_REL);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileSafe(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function appendEnvExample(targetDir: string, block: string): void {
  const envExamplePath = path.join(targetDir, ".env.example");
  if (fs.existsSync(envExamplePath)) {
    const current = fs.readFileSync(envExamplePath, "utf8");
    if (current.includes(block.split("\n")[0] ?? "")) return; // idempotent
    fs.appendFileSync(envExamplePath, "\n" + block + "\n");
  } else {
    fs.writeFileSync(envExamplePath, block + "\n");
  }
}

// ---------------------------------------------------------------------------
// Templates (strings). Kept here so the CLI has zero filesystem template deps
// and can be published standalone. Edit with care — `{{PLACEHOLDER}}` tokens
// are filled by brand-apply downstream.
// ---------------------------------------------------------------------------

const DISCLAIMER_BANNER = `> **TEMPLATE — NOT LEGAL ADVICE.** This document is a boilerplate scaffold only.
> Consult a qualified lawyer in every jurisdiction you operate in before publishing.
> 本文档为模板脚手架，不构成法律意见。发布前请咨询相关司法辖区的合格律师。`;

const FOOTER_COMPONENT = `import Link from "next/link";
import { IcpFooter } from "@/components/compliance/IcpFooter";
import { PublicSecurityFooter } from "@/components/compliance/PublicSecurityFooter";

interface FooterProps {
  region?: "global" | "cn" | "hybrid";
}

export function Footer({ region = "global" }: FooterProps) {
  const showCn = region === "cn" || region === "hybrid";
  return (
    <footer className="border-t border-[var(--neutral-7)] bg-[var(--neutral-2)] py-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 text-sm text-[var(--neutral-11)] md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy / 隐私政策
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms of Service / 服务条款
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("cookie-consent-open"))}
            className="hover:underline"
          >
            Cookie Settings
          </button>
          {showCn ? (
            <>
              <Link href="/aigc-disclosure" className="hover:underline">
                AIGC 说明
              </Link>
              <Link href="/cross-border-data" className="hover:underline">
                数据出境
              </Link>
              <Link href="/pii-collection" className="hover:underline">
                个人信息清单
              </Link>
            </>
          ) : null}
        </div>
        {showCn ? (
          <div className="flex flex-wrap items-center gap-4">
            <IcpFooter />
            <PublicSecurityFooter />
          </div>
        ) : null}
      </div>
    </footer>
  );
}
`;

const ICP_FOOTER_COMPONENT = `export function IcpFooter() {
  const icp = process.env.NEXT_PUBLIC_ICP_BEIAN;
  if (!icp) return null;
  return (
    <a
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-[var(--neutral-11)] hover:underline"
    >
      {icp}
    </a>
  );
}
`;

const PSB_FOOTER_COMPONENT = `export function PublicSecurityFooter() {
  const psb = process.env.NEXT_PUBLIC_PSB_BEIAN;
  const psbCode = process.env.NEXT_PUBLIC_PSB_CODE;
  if (!psb) return null;
  return (
    <a
      href={\`http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=\${psbCode ?? ""}\`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-[var(--neutral-11)] hover:underline"
    >
      {/* Place /public/compliance/psb-icon.png (官方公安备案小徽标) */}
      <img src="/compliance/psb-icon.png" alt="公安备案" className="h-3 w-3" />
      {psb}
    </a>
  );
}
`;

const COOKIE_BANNER_COMPONENT = `"use client";

import { useCallback, useEffect, useState } from "react";

type ConsentMode = "accepted" | "rejected" | "custom";

interface CustomConsent {
  necessary: true; // always true per PIPL/GDPR
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

interface StoredConsent {
  mode: ConsentMode;
  categories: CustomConsent;
  timestamp: number;
  version: 1;
}

const STORAGE_KEY = "cookie-consent";
const CONSENT_EVENT = "cookie-consent-changed";
const OPEN_EVENT = "cookie-consent-open";

const DEFAULT_CATEGORIES: CustomConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

function emitConsent(consent: StoredConsent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }));
}

export function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [categories, setCategories] = useState<CustomConsent>(DEFAULT_CATEGORIES);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setIsOpen(true);
        return;
      }
      const parsed = JSON.parse(stored) as StoredConsent;
      // Re-emit so analytics/marketing scripts mounted after consent can read state
      emitConsent(parsed);
    } catch {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setShowCustomize(true);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, []);

  const persist = useCallback((mode: ConsentMode, cats: CustomConsent) => {
    const consent: StoredConsent = {
      mode,
      categories: cats,
      timestamp: Date.now(),
      version: 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    emitConsent(consent);
    setIsOpen(false);
    setShowCustomize(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist("accepted", {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  }, [persist]);

  const rejectNonEssential = useCallback(() => {
    persist("rejected", DEFAULT_CATEGORIES);
  }, [persist]);

  const saveCustom = useCallback(() => {
    persist("custom", categories);
  }, [persist, categories]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--neutral-7)] bg-[var(--neutral-1)] shadow-lg"
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 p-4 md:p-6">
        <div>
          <h2 id="cookie-banner-title" className="text-sm font-semibold text-[var(--neutral-12)]">
            Cookie Preferences · Cookie 偏好设置
          </h2>
          <p className="mt-1 text-xs text-[var(--neutral-11)]">
            We use cookies to provide essential functionality, analyze usage, and personalize content.
            You can accept all, reject non-essential, or customize your choice. See our{" "}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>
            .
            <br />
            我们使用 Cookie 提供必要功能、分析使用情况并个性化内容。您可以接受全部、拒绝非必要，或自定义选择。详见
            <a href="/privacy" className="underline">
              隐私政策
            </a>
            。
          </p>
        </div>

        {showCustomize ? (
          <fieldset className="grid gap-3 md:grid-cols-2">
            <CategoryRow
              id="necessary"
              title="Necessary / 必要"
              description="Required for the site to function. Cannot be disabled. / 站点运行所必需，无法关闭。"
              checked={true}
              disabled
              onChange={() => undefined}
            />
            <CategoryRow
              id="analytics"
              title="Analytics / 分析"
              description="Helps us understand usage patterns. / 帮助我们了解使用模式。"
              checked={categories.analytics}
              onChange={(v) => setCategories((c) => ({ ...c, analytics: v }))}
            />
            <CategoryRow
              id="marketing"
              title="Marketing / 营销"
              description="Used for targeted advertising. / 用于定向广告。"
              checked={categories.marketing}
              onChange={(v) => setCategories((c) => ({ ...c, marketing: v }))}
            />
            <CategoryRow
              id="preferences"
              title="Preferences / 偏好"
              description="Remember your preferences (language, theme). / 记住您的偏好（语言、主题）。"
              checked={categories.preferences}
              onChange={(v) => setCategories((c) => ({ ...c, preferences: v }))}
            />
          </fieldset>
        ) : null}

        <div className="flex flex-wrap gap-2 md:justify-end">
          {showCustomize ? (
            <button
              type="button"
              onClick={saveCustom}
              className="rounded-md bg-[var(--blue-9)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
            >
              Save Preferences / 保存偏好
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomize(true)}
              className="rounded-md border border-[var(--neutral-7)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
            >
              Customize / 自定义
            </button>
          )}
          <button
            type="button"
            onClick={rejectNonEssential}
            className="rounded-md border border-[var(--neutral-7)] px-4 py-2 text-sm font-medium text-[var(--neutral-12)] hover:bg-[var(--neutral-3)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
          >
            Reject Non-Essential / 拒绝非必要
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-md bg-[var(--blue-9)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
          >
            Accept All / 全部接受
          </button>
        </div>
      </div>
    </div>
  );
}

interface CategoryRowProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function CategoryRow({ id, title, description, checked, disabled, onChange }: CategoryRowProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 rounded-md border border-[var(--neutral-7)] p-3"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4"
      />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-[var(--neutral-12)]">{title}</span>
        <span className="text-xs text-[var(--neutral-11)]">{description}</span>
      </span>
    </label>
  );
}
`;

const AIGC_DISCLAIMER_COMPONENT = `interface AigcDisclaimerProps {
  className?: string;
}

/**
 * Inline disclaimer for AI-generated content (required by 网信办《生成式人工智能
 * 服务管理暂行办法》2023/2024). Attach to any block/page that contains AI output.
 */
export function AigcDisclaimer({ className }: AigcDisclaimerProps) {
  return (
    <div className={className}>
      <p className="text-xs text-[var(--neutral-11)]">
        本内容由 AI 生成 · AI-Generated Content ·{" "}
        <a href="/aigc-disclosure" className="underline">
          了解更多 / Learn more
        </a>
      </p>
    </div>
  );
}
`;

// -- MDX policy templates ---------------------------------------------------

const PRIVACY_MDX = `---
title: Privacy Policy / 隐私政策
description: How {{COMPANY_NAME}} collects, uses, shares, and protects personal information.
lastUpdated: 2026-01-01
---

${DISCLAIMER_BANNER}

# Privacy Policy / 隐私政策

> **Effective Date:** 2026-01-01 · **Last Updated:** 2026-01-01
> **生效日期：** 2026-01-01 · **最后更新：** 2026-01-01

This Privacy Policy describes how **{{COMPANY_NAME}}** ("we", "us", "our") collects, uses, shares,
and protects your personal information in connection with our services.

本隐私政策说明 **{{COMPANY_NAME}}**（"我们"）在提供服务过程中如何收集、使用、共享和保护您的个人信息。

---

## 1. Data Collection Scope / 数据收集范围

**EN:** We collect the following categories of personal information:
- **Account data:** name, email address, phone number, password (hashed).
- **Usage data:** IP address, browser, device, operating system, page views, clickstream, timestamps.
- **Billing data:** payment method tokens (handled by our payment processor), billing address.
- **Content data:** files, messages, and other content you upload or create.
- **Cookies & similar technologies:** see our Cookie Preferences banner for details.

**ZH:** 我们收集以下类别的个人信息：
- **账户信息：** 姓名、邮箱、手机号、密码（加密存储）。
- **使用信息：** IP 地址、浏览器、设备、操作系统、页面浏览、点击流、时间戳。
- **支付信息：** 支付令牌（由第三方支付服务商处理）、账单地址。
- **内容信息：** 您上传或创建的文件、消息等内容。
- **Cookie 及类似技术：** 详见 Cookie 偏好设置。

---

## 2. Purpose / 使用目的

**EN:** We use personal information to (a) provide and maintain the service; (b) authenticate users;
(c) process payments; (d) detect and prevent fraud/abuse; (e) improve product quality; (f) comply with
legal obligations; (g) communicate about the service (with consent where required).

**ZH:** 我们将个人信息用于：(a) 提供和维护服务；(b) 用户身份验证；(c) 处理支付；(d) 检测和防范
欺诈/滥用；(e) 改进产品质量；(f) 履行法律义务；(g) 就服务与您沟通（需要时取得您的同意）。

---

## 3. Sharing & Cross-Border Transfer / 数据共享及跨境传输

**EN:** We share personal information only with:
- **Processors** (cloud hosting, analytics, email, payment) bound by data processing agreements.
- **Legal authorities** when required by law.
- **Business transferees** in the event of merger, acquisition, or asset sale.

Some processors operate **outside your country**. For users in China, see our separate
[Cross-Border Data Notice](/cross-border-data). For users in the EEA/UK, transfers rely on
Standard Contractual Clauses or equivalent safeguards.

**ZH:** 我们仅与以下主体共享个人信息：
- **处理者**（云服务、分析、邮件、支付）—— 受数据处理协议约束。
- **司法/监管机关** —— 依法律要求。
- **业务继受者** —— 发生合并、收购或资产出售时。

部分处理者位于**境外**。中国境内用户请参阅《[数据出境告知](/cross-border-data)》。
欧盟/英国用户的跨境传输依据《标准合同条款》(SCCs) 或等效保护措施。

---

## 4. Your Rights / 用户权利

**EN:** Depending on your jurisdiction (GDPR/CCPA/PIPL/等), you may have the right to:
- **Access** your personal information.
- **Rectify** inaccurate data.
- **Delete** your data ("right to be forgotten").
- **Export** your data in a portable format.
- **Restrict or object** to certain processing.
- **Withdraw consent** at any time without affecting the lawfulness of prior processing.
- **Lodge a complaint** with your local supervisory authority.

To exercise these rights, contact **{{COMPANY_CONTACT_EMAIL}}**.

**ZH:** 根据您所在司法辖区（《个人信息保护法》/GDPR/CCPA 等），您可能享有以下权利：
- **访问**您的个人信息。
- **更正**不准确信息。
- **删除**您的数据（被遗忘权）。
- **导出**您的数据（可携带格式）。
- **限制或反对**特定处理。
- **随时撤回同意**（不影响撤回前的处理合法性）。
- 向当地监管机构**投诉**。

如需行使上述权利，请联系 **{{COMPANY_CONTACT_EMAIL}}**。

---

## 5. Cookies / Cookie 使用

See our Cookie Preferences banner (footer → Cookie Settings). We categorize cookies as:
Necessary (cannot be disabled), Analytics, Marketing, Preferences.

请参阅 Cookie 偏好设置（页脚 → Cookie Settings）。Cookie 类别包括：必要（不可关闭）、
分析、营销、偏好。

---

## 6. Data Security / 数据安全措施

**EN:** Administrative, technical, and physical safeguards include TLS 1.2+ in transit, AES-256 at rest
(envelope encryption for secrets via \`@nebutra/vault\`), role-based access control, audit logging,
periodic vulnerability scans, and least-privilege principles. No system is 100% secure; we notify
affected users and regulators of material breaches within statutory timelines.

**ZH:** 我们采取管理、技术和物理层面的保障措施，包括传输中 TLS 1.2+、静态 AES-256 加密
（密钥通过 \`@nebutra/vault\` 信封加密管理）、基于角色的访问控制、审计日志、定期漏洞扫描
和最小权限原则。任何系统都无法做到绝对安全；发生重大数据泄露时，我们将在法定期限内
通知受影响用户和监管机构。

---

## 7. Retention / 数据保留

We retain personal information only as long as necessary to fulfill the purposes described, or as
required by law. Inactive accounts are deleted after 24 months unless retention is legally required.

我们仅在实现上述目的所需的期间或法律要求的期间内保留个人信息。非活跃账户将在 24 个月后
删除，法律另有要求的除外。

---

## 8. Changes / 变更通知

We will notify you of material changes by posting the updated policy and, where required, by email
or in-app notification before the change takes effect.

我们将通过发布更新后的政策通知您重大变更；如法律要求，还将在变更生效前通过邮件或应用内
通知的方式告知。

---

## 9. Contact / 联系方式

**Data Controller / 数据控制者:** {{COMPANY_NAME}}
**Address / 地址:** {{COMPANY_ADDRESS}}
**Email / 邮箱:** {{COMPANY_CONTACT_EMAIL}}
`;

const TERMS_MDX = `---
title: Terms of Service / 服务条款
description: Terms governing your use of {{COMPANY_NAME}}.
lastUpdated: 2026-01-01
---

${DISCLAIMER_BANNER}

# Terms of Service / 服务条款

> **Effective Date:** 2026-01-01
> **生效日期：** 2026-01-01

## 1. Acceptance / 接受条款

**EN:** By accessing or using the services provided by {{COMPANY_NAME}} ("Service"), you agree to be
bound by these Terms. If you do not agree, do not use the Service.

**ZH:** 您访问或使用 {{COMPANY_NAME}} 提供的服务（"服务"）即表示同意受本条款约束。
如不同意，请勿使用本服务。

---

## 2. Eligibility / 用户资格

You must be at least 13 years old (or the minimum age in your jurisdiction, whichever is higher) and
have the legal capacity to enter into a contract.

用户须年满 13 周岁（或其所在司法辖区规定的最低年龄，取较高者）并具备签订合同的法律行为能力。

---

## 3. Accounts / 账户

You are responsible for maintaining the confidentiality of your credentials and for all activity
under your account. Notify us immediately of any unauthorized use at {{COMPANY_CONTACT_EMAIL}}.

您负责保管账户凭据的机密性，并对账户下的一切活动负责。发现未经授权的使用，请立即通过
{{COMPANY_CONTACT_EMAIL}} 通知我们。

---

## 4. Acceptable Use / 合规使用

You agree not to: (a) violate any law; (b) infringe intellectual property rights; (c) transmit
malware; (d) reverse engineer the Service except as permitted by law; (e) use the Service for
activities prohibited in your jurisdiction (including content review regulations in the PRC).

您同意不得：(a) 违反任何法律；(b) 侵犯知识产权；(c) 传播恶意软件；(d) 超出法律允许范围对
服务进行逆向工程；(e) 将服务用于您所在司法辖区（包括中国境内内容审核法规）禁止的活动。

---

## 5. Subscription & Billing / 订阅与计费

Paid plans are billed in advance on a recurring basis. You authorize us to charge your payment
method until you cancel. Refunds are handled in accordance with applicable law and our refund policy.

付费订阅按周期预先计费。您授权我们向您的支付方式持续扣款，直至您取消订阅。退款依适用法律
及本服务退款政策处理。

---

## 6. Intellectual Property / 知识产权

**EN:** The Service, including all software, design, and content provided by us, is owned by
{{COMPANY_NAME}} and protected by copyright, trademark, and other laws. You retain ownership of
content you upload; you grant us a worldwide, non-exclusive, royalty-free license to host, process,
and display your content solely to provide the Service.

**ZH:** 服务（包括我们提供的所有软件、设计和内容）归 {{COMPANY_NAME}} 所有，受著作权、
商标及其他法律保护。您保留对您上传内容的所有权；您授予我们全球范围内、非独占、免版税的
许可，仅用于托管、处理和展示您的内容以提供服务。

---

## 7. AI-Generated Content / 生成式 AI 内容

Outputs generated by AI models are provided "as-is". You are responsible for verifying accuracy
and ensuring compliance with applicable laws (including Chinese AIGC regulations) before relying
on or publishing such outputs. See the [AIGC Disclosure](/aigc-disclosure) for details.

AI 模型生成的输出按"现状"提供。您应负责核实其准确性，并在依赖或发布前确保符合适用法律
（包括中国 AIGC 新规）。详见《[AIGC 说明](/aigc-disclosure)》。

---

## 8. Disclaimer & Limitation of Liability / 免责声明及责任限制

**EN:** TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES.
IN NO EVENT SHALL {{COMPANY_NAME}} BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.

**ZH:** 在法律允许的最大范围内，服务按"现状"提供，不作任何明示或默示保证。{{COMPANY_NAME}}
概不对间接、偶然或后果性损失承担责任。

---

## 9. Termination / 终止

We may suspend or terminate your account for material breach. You may cancel at any time from
your account settings.

因重大违约，我们可暂停或终止您的账户。您可随时在账户设置中取消订阅。

---

## 10. Governing Law / 适用法律

These Terms are governed by the laws of **{{GOVERNING_JURISDICTION}}**, without regard to
conflict-of-laws principles. Disputes shall be resolved in the competent courts of that jurisdiction.

本条款受 **{{GOVERNING_JURISDICTION}}** 法律管辖，不考虑冲突法原则。争议应提交至该
司法辖区的有管辖权法院解决。

---

## 11. Contact / 联系方式

{{COMPANY_NAME}} · {{COMPANY_ADDRESS}} · {{COMPANY_CONTACT_EMAIL}}
`;

const AIGC_DISCLOSURE_MDX = `---
title: AIGC Disclosure / 生成式 AI 服务说明
description: Disclosure required by 网信办《生成式人工智能服务管理暂行办法》
lastUpdated: 2026-01-01
---

${DISCLAIMER_BANNER}

# AIGC Disclosure / 生成式 AI 服务说明

This disclosure is provided in accordance with the **Interim Measures for the Management of
Generative AI Services** (生成式人工智能服务管理暂行办法) promulgated by the Cyberspace
Administration of China.

本说明依据国家互联网信息办公室《生成式人工智能服务管理暂行办法》的要求提供。

---

## 1. AI Models Used / 使用的 AI 模型

> TODO (fill in before launch / 上线前填写):

| Model / 模型 | Provider / 提供方 | Use Case / 用途 |
| --- | --- | --- |
| _e.g. GPT-4o_ | _OpenAI_ | _Chat, content drafting_ |
| _e.g. Claude 3.5 Sonnet_ | _Anthropic_ | _Reasoning, code generation_ |
| _e.g. 通义千问_ | _阿里云_ | _中文内容生成_ |

---

## 2. Algorithm Filing / 算法备案号

**Filing Number / 备案号:** \`{{AIGC_ALGORITHM_FILING_NUMBER}}\`
(Apply at <https://beian.cac.gov.cn/> · 于中国网信办完成算法备案)

---

## 3. AI-Generated Content Labeling / 生成内容标识机制

**EN:** All content generated by AI models in this product is labeled with:
- An inline disclaimer: "本内容由 AI 生成 · AI-Generated Content".
- Machine-readable metadata (where the output format supports it): \`X-AI-Generated: true\`.
- For images/videos: visible watermark and/or embedded metadata per GB/T 45438-2025.

**ZH:** 本产品中由 AI 模型生成的所有内容均带有：
- 显式文字标识："本内容由 AI 生成 · AI-Generated Content"。
- 机器可读元数据（视输出格式支持）：\`X-AI-Generated: true\`。
- 图片/视频：可见水印和/或依 GB/T 45438-2025 嵌入元数据。

---

## 4. Training Data / 训练数据说明

We do **not** train foundation models in-house. We use third-party model APIs whose training data
practices are described in their respective privacy notices. We do not use customer data to train
third-party models by default (opt-out where offered).

我们**不**自行训练基础模型。我们使用第三方模型 API，其训练数据实践详见各自的隐私说明。
默认情况下，我们不会使用客户数据训练第三方模型（在可选退出的情况下已选择退出）。

---

## 5. Reporting Channel / 举报渠道

If you encounter illegal content, hallucinated output causing harm, or suspected misuse, report to:

如您发现违法内容、导致损害的幻觉输出或疑似滥用，请通过以下渠道举报：

- **Email / 邮箱:** {{COMPANY_CONTACT_EMAIL}}
- **In-app:** Settings → Feedback → Report AI Content / 应用内：设置 → 反馈 → 举报 AI 内容
- **Regulator / 监管部门:** [国家互联网信息办公室举报中心](https://www.12377.cn/)

---

## 6. Limitations / 局限性

AI outputs may be inaccurate, biased, or out of date. Do **not** rely on AI outputs for medical,
legal, financial, or safety-critical decisions without independent verification by a qualified
human professional.

AI 输出可能不准确、存在偏见或过时。**请勿**在未经合格专业人士独立核实的情况下，将 AI 输出
用于医疗、法律、金融或安全攸关的决策。
`;

const CROSS_BORDER_MDX = `---
title: Cross-Border Data Notice / 数据出境告知
description: Notice of cross-border transfer of personal information, per PIPL.
lastUpdated: 2026-01-01
---

${DISCLAIMER_BANNER}

# Cross-Border Data Notice / 数据出境告知

Pursuant to Articles 38–41 of the **Personal Information Protection Law of the PRC** (《个人信息
保护法》, "PIPL"), we notify users that the following personal information may be transferred
outside mainland China to provide the Service.

依据《中华人民共和国个人信息保护法》第三十八条至第四十一条，我们告知用户，以下个人信息
可能为提供服务而传输至中国大陆境外。

---

## 1. Overseas Recipients / 境外接收方

> TODO (fill in before launch / 上线前填写):

| Recipient / 接收方 | Country / 国家 | Purpose / 目的 | Data Categories / 数据类别 |
| --- | --- | --- | --- |
| _AWS (example)_ | _US_ | _Hosting_ | _Account, usage logs, content_ |
| _OpenAI_ | _US_ | _LLM inference_ | _Prompts, generated content_ |
| _Resend_ | _US_ | _Transactional email_ | _Email address, message body_ |
| _Cloudflare_ | _US / Global_ | _CDN, DDoS protection_ | _IP address, request metadata_ |

---

## 2. Legal Basis / 合法性基础

Cross-border transfers rely on one of:
- **User's separate consent** under PIPL Article 39.
- **Standard Contract** with the overseas recipient per CAC Measures (CAC 标准合同).
- **Security Assessment** by the CAC (for transfers meeting statutory thresholds).

跨境传输依据以下之一：
- 《个人信息保护法》第三十九条下的**单独同意**。
- 与境外接收方签订的 **CAC 标准合同**。
- 达到法定门槛时的**网信办安全评估**。

---

## 3. Your Rights / 您的权利

You may **refuse** cross-border transfer at any time by contacting {{COMPANY_CONTACT_EMAIL}}.
Refusal may limit your ability to use features that rely on overseas services.

您可随时联系 {{COMPANY_CONTACT_EMAIL}} 拒绝跨境传输。拒绝可能会限制您使用依赖境外服务的
功能。

---

## 4. Safeguards / 保障措施

- Encryption in transit (TLS 1.2+) and at rest (AES-256).
- Contractual clauses obligating overseas recipients to provide PIPL-equivalent protection.
- Access controls, audit logging, and breach notification procedures.

- 传输中加密 (TLS 1.2+) 及静态加密 (AES-256)。
- 合同条款要求境外接收方提供等同于 PIPL 的保护。
- 访问控制、审计日志和违规通知程序。
`;

const PII_COLLECTION_MDX = `---
title: Personal Information Collection List / 个人信息收集清单
description: Itemized list of personal information collected, per PIPL Article 17.
lastUpdated: 2026-01-01
---

${DISCLAIMER_BANNER}

# Personal Information Collection List / 个人信息收集清单

Pursuant to Article 17 of the **PIPL**, we publish an itemized list of personal information
collected, the purpose of processing, and retention period.

依据《个人信息保护法》第十七条，我们公开个人信息收集清单，包括收集项、处理目的和保留期限。

---

| Category / 类别 | Item / 项 | Purpose / 目的 | Source / 来源 | Retention / 保留期 | Required? / 必要? |
| --- | --- | --- | --- | --- | --- |
| Account / 账户 | Email / 邮箱 | Registration, auth, notifications / 注册、登录、通知 | User-provided | Until account deletion + 30d / 账户删除后 30 天 | Yes / 是 |
| Account / 账户 | Password (hashed) / 密码（加密） | Authentication / 身份验证 | User-provided | Until account deletion / 账户删除 | Yes / 是 |
| Account / 账户 | Phone / 手机号 | 2FA, account recovery / 双因素、账户恢复 | User-provided | Until account deletion / 账户删除 | Optional / 可选 |
| Profile / 资料 | Display name, avatar / 昵称、头像 | Service personalization / 服务个性化 | User-provided | Until updated / 直至更新 | Optional / 可选 |
| Usage / 使用 | IP address / IP 地址 | Security, abuse prevention / 安全、防滥用 | Automatic / 自动 | 90 days / 90 天 | Yes / 是 |
| Usage / 使用 | User agent / 浏览器标识 | Compatibility, security / 兼容性、安全 | Automatic / 自动 | 90 days / 90 天 | Yes / 是 |
| Usage / 使用 | Page views, clickstream / 页面浏览、点击流 | Analytics, product improvement / 分析、产品改进 | Automatic / 自动 | 13 months / 13 个月 | Consent / 需同意 |
| Usage / 使用 | Cookies / Cookie | See Cookie Preferences / 详见 Cookie 偏好 | Automatic / 自动 | Varies / 不一 | Consent / 需同意 |
| Billing / 支付 | Billing address / 账单地址 | Payment processing / 支付处理 | User-provided | 7 years (tax) / 7 年（税务） | If paid plan / 付费时 |
| Billing / 支付 | Payment method token / 支付令牌 | Recurring billing / 订阅续费 | Stripe / payment processor | Until deletion / 直至删除 | If paid plan / 付费时 |
| Content / 内容 | Uploaded files / 上传文件 | Service delivery / 服务交付 | User-provided | Until deletion by user / 直至用户删除 | Optional / 可选 |
| Content / 内容 | Messages, prompts / 消息、提示词 | Service delivery, AI inference / 服务交付、AI 推理 | User-provided | 30 days then purged unless saved / 30 天后清除（除非保存） | Optional / 可选 |
| Behavior / 行为 | Feature flags, experiments / 功能开关、实验 | Product personalization / 产品个性化 | Automatic / 自动 | 13 months / 13 个月 | Consent / 需同意 |
| Device / 设备 | Device ID, OS version / 设备 ID、系统版本 | Security, compatibility / 安全、兼容性 | Automatic / 自动 | 90 days / 90 天 | Yes / 是 |

---

## Contact / 联系方式

To exercise your rights (access, rectify, delete, export, withdraw consent), contact
**{{COMPANY_CONTACT_EMAIL}}**.

如需行使您的权利（访问、更正、删除、导出、撤回同意），请联系 **{{COMPANY_CONTACT_EMAIL}}**。
`;

// ---------------------------------------------------------------------------
// Writers — each injects one artifact. All silent-skip if apps/web missing.
// ---------------------------------------------------------------------------

async function injectFooter(targetDir: string, region: ComplianceRegion): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;

  const footerPath = path.join(web, "src", "components", "compliance", "Footer.tsx");
  writeFileSafe(footerPath, FOOTER_COMPONENT);

  // Append a README pointer so brand-apply / humans know how to mount it
  const readmePath = path.join(web, "src", "components", "compliance", "README.md");
  writeFileSafe(
    readmePath,
    [
      "# Compliance Components",
      "",
      `Auto-generated by \`create-sailor\` for region: \`${region}\`.`,
      "",
      "## Mounting the Footer",
      "",
      "```tsx",
      `import { Footer } from "@/components/compliance/Footer";`,
      `import { CookieBanner } from "@/components/compliance/CookieBanner";`,
      "",
      "export default function RootLayout({ children }) {",
      "  return (",
      "    <html>",
      "      <body>",
      "        {children}",
      `        <Footer region="${region}" />`,
      "        <CookieBanner />",
      "      </body>",
      "    </html>",
      "  );",
      "}",
      "```",
      "",
      "## Placeholders",
      "",
      "Policy MDX files contain `{{COMPANY_NAME}}`, `{{COMPANY_ADDRESS}}`,",
      "`{{COMPANY_CONTACT_EMAIL}}`, `{{GOVERNING_JURISDICTION}}`, and",
      "`{{AIGC_ALGORITHM_FILING_NUMBER}}`. These are filled by the `brand-apply` step.",
      "",
    ].join("\n"),
  );
}

async function injectCookieBanner(targetDir: string, _region: ComplianceRegion): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;
  const target = path.join(web, "src", "components", "compliance", "CookieBanner.tsx");
  writeFileSafe(target, COOKIE_BANNER_COMPONENT);
}

async function writePrivacyPolicyTemplate(
  targetDir: string,
  _region: ComplianceRegion,
): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;
  const target = path.join(web, LOCALE_APP_REL, "privacy", "page.mdx");
  writeFileSafe(target, PRIVACY_MDX);
}

async function writeTermsOfServiceTemplate(
  targetDir: string,
  _region: ComplianceRegion,
): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;
  const target = path.join(web, LOCALE_APP_REL, "terms", "page.mdx");
  writeFileSafe(target, TERMS_MDX);
}

async function injectIcpFooter(targetDir: string): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;
  const target = path.join(web, COMPONENTS_REL, "IcpFooter.tsx");
  writeFileSafe(target, ICP_FOOTER_COMPONENT);
  appendEnvExample(
    targetDir,
    [
      "# Chinese ICP filing (工信部 ICP 备案) — required to legally host a",
      "# public-facing site from mainland China. Apply at https://beian.miit.gov.cn/",
      `NEXT_PUBLIC_ICP_BEIAN=""  # 如 苏ICP备2024XXXXXX号`,
    ].join("\n"),
  );
}

async function injectPublicSecurityFooter(targetDir: string): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;
  const target = path.join(web, COMPONENTS_REL, "PublicSecurityFooter.tsx");
  writeFileSafe(target, PSB_FOOTER_COMPONENT);
  appendEnvExample(
    targetDir,
    [
      "# Chinese Public Security Bureau filing (公安联网备案)",
      "# Required in addition to ICP. Apply at http://www.beian.gov.cn/",
      `NEXT_PUBLIC_PSB_BEIAN=""  # 如 苏公网安备 32011402XXXXXX号`,
      `NEXT_PUBLIC_PSB_CODE=""   # 14-digit record code`,
    ].join("\n"),
  );
}

async function injectAigcDisclaimer(targetDir: string): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;
  const target = path.join(web, COMPONENTS_REL, "AigcDisclaimer.tsx");
  writeFileSafe(target, AIGC_DISCLAIMER_COMPONENT);
  appendEnvExample(
    targetDir,
    [
      "# Generative AI algorithm filing (算法备案号) — required by",
      "# 网信办《生成式人工智能服务管理暂行办法》for services offered in China.",
      `NEXT_PUBLIC_AIGC_FILING_NUMBER=""  # e.g. 网信算备XXXXXXXX号`,
    ].join("\n"),
  );
}

async function writeAigcDisclosureTemplate(targetDir: string): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;
  const target = path.join(web, LOCALE_APP_REL, "aigc-disclosure", "page.mdx");
  writeFileSafe(target, AIGC_DISCLOSURE_MDX);
}

async function writePipelineCrossBorderNotice(targetDir: string): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;
  const target = path.join(web, LOCALE_APP_REL, "cross-border-data", "page.mdx");
  writeFileSafe(target, CROSS_BORDER_MDX);
}

async function writePiiCollectionList(targetDir: string): Promise<void> {
  const web = webAppDir(targetDir);
  if (!fs.existsSync(web)) return;
  const target = path.join(web, LOCALE_APP_REL, "pii-collection", "page.mdx");
  writeFileSafe(target, PII_COLLECTION_MDX);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function applyComplianceTemplates(
  targetDir: string,
  region: ComplianceRegion,
): Promise<void> {
  try {
    // Always do: Footer + privacy policy template + cookie banner
    await injectFooter(targetDir, region);
    await injectCookieBanner(targetDir, region);
    await writePrivacyPolicyTemplate(targetDir, region);
    await writeTermsOfServiceTemplate(targetDir, region);

    // CN + hybrid: AIGC disclaimer + ICP footer + data export notice
    if (region === "cn" || region === "hybrid") {
      await injectIcpFooter(targetDir);
      await injectPublicSecurityFooter(targetDir);
      await injectAigcDisclaimer(targetDir);
      await writeAigcDisclosureTemplate(targetDir);
      await writePipelineCrossBorderNotice(targetDir);
      await writePiiCollectionList(targetDir);
    }
  } catch (error) {
    console.error("applyComplianceTemplates failed:", error);
    throw new Error(
      `Failed to apply compliance templates for region "${region}". ` +
        `Check that ${targetDir} is writable.`,
    );
  }
}
