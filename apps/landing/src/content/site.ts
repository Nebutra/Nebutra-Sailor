/**
 * Your marketing site's words — the one file to edit.
 *
 * Every sentence the starter site shows lives here: the hero, the features,
 * pricing, the FAQ, the closing call to action, the footer and the page
 * titles search engines read. The components under
 * src/components/starter/ only lay these out, so rewriting the site for your
 * product never means touching markup.
 *
 * - Each string has an English and a Chinese version (`en`, `zh`). Chinese
 *   pages (zh-Hans, zh-Hant) read `zh`; every other language reads `en`.
 * - `{brand}` is replaced with your brand name from brand.config.ts, so a
 *   rename (`pnpm brand:apply`) carries through without editing this file.
 * - Links point at pages the site serves (see src/site-map.ts) or at the
 *   product app (`app:` + a path, e.g. `app:/sign-in`).
 *
 * Pricing: these are the prices the site shows. What a customer is actually
 * charged is the offer catalogue in @nebutra/billing (`configureOffers`) and
 * your payment provider's prices — keep the three in step when you change one.
 */

import type { IconName } from "@/components/starter/starter-icon";

export interface Copy {
  en: string;
  zh: string;
}

export interface Link {
  label: Copy;
  /** A site path ("/pricing", "/#features") or a product-app path ("app:/sign-in"). */
  href: string;
}

export interface Feature {
  icon: IconName;
  title: Copy;
  body: Copy;
}

export type Currency = "USD" | "CNY";

export interface Plan {
  id: string;
  name: Copy;
  blurb: Copy;
  /** Per month, in whole units. `null` = priced on request. 0 = free. */
  price: Record<"monthly" | "yearly", Record<Currency, number> | null>;
  /** Shown under the price, e.g. "per member / month". */
  unit: Copy;
  features: Copy[];
  cta: Link;
  /** Draws the card forward and shows this badge. */
  highlight?: Copy;
}

export interface Question {
  q: Copy;
  a: Copy;
}

export const SITE = {
  /** Search results and link previews. */
  meta: {
    title: {
      en: "{brand} — plan, ship and grow in one place",
      zh: "{brand} — 规划、交付与增长，一处完成",
    },
    description: {
      en: "{brand} brings your team's work, customers and numbers into one workspace, so you spend the week building instead of stitching tools together.",
      zh: "{brand} 把团队的工作、客户和数据放进同一个工作空间，让你把时间花在产品上，而不是在工具之间来回切换。",
    },
  },

  hero: {
    eyebrow: { en: "Now open to every team", zh: "现已向所有团队开放" },
    /** The one-line pitch under your brand name. */
    pitch: {
      en: "The workspace where your team plans the work, ships it, and sees what it moved.",
      zh: "团队规划工作、交付成果、看清影响的同一个工作空间。",
    },
    body: {
      en: "Sign in with your team, invite the people you work with, and pick up where you left off on any device. Free to start, no card needed.",
      zh: "与团队一起登录，邀请同事加入，在任何设备上接着上次的进度继续。免费开始，无需绑卡。",
    },
    primary: { label: { en: "Start for free", zh: "免费开始" }, href: "app:/sign-in?mode=sign-up" },
    secondary: { label: { en: "See pricing", zh: "查看价格" }, href: "/pricing" },
  },

  features: {
    eyebrow: { en: "Features", zh: "功能" },
    title: {
      en: "Everything a team needs from day one",
      zh: "团队第一天就需要的，都已就绪",
    },
    lead: {
      en: "The essentials are built in and work together, so there is nothing to wire up before you start.",
      zh: "核心能力开箱即用、彼此打通，开始之前无需任何配置。",
    },
    items: [
      {
        icon: "fingerprint",
        title: { en: "Sign in your way", zh: "随心登录" },
        body: {
          en: "Email and password, passkeys or your existing accounts, with two-step verification for anyone who wants it.",
          zh: "邮箱密码、通行密钥或已有账号均可登录，需要时开启两步验证。",
        },
      },
      {
        icon: "users",
        title: { en: "Built for teams", zh: "为团队而生" },
        body: {
          en: "Shared workspaces with roles, so everyone sees what they need and nothing they shouldn't.",
          zh: "带角色权限的共享工作空间，每个人只看到该看的内容。",
        },
      },
      {
        icon: "card",
        title: { en: "Simple billing", zh: "简单透明的计费" },
        body: {
          en: "Upgrade, downgrade or cancel in a few clicks. Invoices land in your inbox, and you only pay for what you use.",
          zh: "升级、降级或取消只需几次点击，发票自动发送到邮箱，按实际使用付费。",
        },
      },
      {
        icon: "globe",
        title: { en: "Works in your language", zh: "说你的语言" },
        body: {
          en: "The interface, emails and dates follow each person's language and region.",
          zh: "界面、邮件和日期格式会跟随每个人的语言与地区。",
        },
      },
      {
        icon: "shield",
        title: { en: "Secure by default", zh: "默认安全" },
        body: {
          en: "Encrypted secrets, isolated workspace data and an audit log of every sensitive change.",
          zh: "密钥加密存储，工作空间数据相互隔离，每次敏感操作都留有审计记录。",
        },
      },
      {
        icon: "plug",
        title: { en: "Connects to your stack", zh: "连接你的工具" },
        body: {
          en: "A documented API and signed webhooks keep your other tools in sync without manual exports.",
          zh: "完善的 API 与签名 Webhook 让其他工具自动保持同步，告别手动导出。",
        },
      },
    ] satisfies Feature[],
  },

  pricing: {
    eyebrow: { en: "Pricing", zh: "价格" },
    title: { en: "Start free, upgrade when you grow", zh: "免费开始，随团队成长升级" },
    lead: {
      en: "Every plan includes the full product. Pay yearly and get two months free.",
      zh: "所有套餐都包含完整产品功能。按年付费，赠送两个月。",
    },
    monthly: { en: "Monthly", zh: "按月" },
    yearly: { en: "Yearly", zh: "按年" },
    onRequest: { en: "Let's talk", zh: "按需报价" },
    plans: [
      {
        id: "free",
        name: { en: "Free", zh: "免费版" },
        blurb: {
          en: "For individuals and small teams trying it out.",
          zh: "适合个人和刚开始试用的小团队。",
        },
        price: { monthly: { USD: 0, CNY: 0 }, yearly: { USD: 0, CNY: 0 } },
        unit: { en: "forever", zh: "永久免费" },
        features: [
          { en: "Up to 3 members", zh: "最多 3 名成员" },
          { en: "1 workspace", zh: "1 个工作空间" },
          { en: "Community support", zh: "社区支持" },
        ],
        cta: { label: { en: "Start for free", zh: "免费开始" }, href: "app:/sign-in?mode=sign-up" },
      },
      {
        id: "pro",
        name: { en: "Pro", zh: "专业版" },
        blurb: {
          en: "For growing teams that run their week on it.",
          zh: "适合每天依靠它推进工作的成长型团队。",
        },
        price: { monthly: { USD: 12, CNY: 88 }, yearly: { USD: 10, CNY: 73 } },
        unit: { en: "per member / month", zh: "每成员 / 月" },
        features: [
          { en: "Unlimited members", zh: "不限成员数" },
          { en: "Unlimited workspaces", zh: "不限工作空间" },
          { en: "Roles and permissions", zh: "角色与权限" },
          { en: "API access and webhooks", zh: "API 与 Webhook" },
          { en: "Email support", zh: "邮件支持" },
        ],
        cta: {
          label: { en: "Start a free trial", zh: "开始免费试用" },
          href: "app:/sign-in?mode=sign-up",
        },
        highlight: { en: "Most popular", zh: "最受欢迎" },
      },
      {
        id: "business",
        name: { en: "Business", zh: "企业版" },
        blurb: {
          en: "For organizations with security and compliance needs.",
          zh: "适合有安全与合规要求的组织。",
        },
        price: { monthly: null, yearly: null },
        unit: { en: "tailored to your team", zh: "按团队定制" },
        features: [
          { en: "Everything in Pro", zh: "包含专业版全部功能" },
          { en: "Single sign-on (SSO)", zh: "单点登录（SSO）" },
          { en: "Audit log export", zh: "审计日志导出" },
          { en: "Data processing agreement", zh: "数据处理协议" },
          { en: "Priority support", zh: "优先支持" },
        ],
        cta: { label: { en: "Contact sales", zh: "联系销售" }, href: "/contact" },
      },
    ] satisfies Plan[],
  },

  faq: {
    eyebrow: { en: "FAQ", zh: "常见问题" },
    title: { en: "Questions, answered", zh: "你可能想问" },
    lead: {
      en: "Can't find what you're looking for? Get in touch and we'll reply within one business day.",
      zh: "没找到答案？联系我们，我们会在一个工作日内回复。",
    },
    items: [
      {
        q: { en: "Is there a free plan?", zh: "有免费套餐吗？" },
        a: {
          en: "Yes. The Free plan has no time limit and needs no card. Upgrade whenever your team outgrows it.",
          zh: "有。免费版没有时间限制，也无需绑卡。团队规模扩大后可随时升级。",
        },
      },
      {
        q: { en: "Can I change plans later?", zh: "之后可以更换套餐吗？" },
        a: {
          en: "Any time. Upgrades apply straight away; downgrades take effect at the end of your billing period, and we credit the difference.",
          zh: "随时可以。升级立即生效；降级在当前计费周期结束后生效，差额会计入余额。",
        },
      },
      {
        q: { en: "How do I cancel?", zh: "如何取消订阅？" },
        a: {
          en: "From the billing page in the app, in two clicks. You keep access until the period you paid for ends.",
          zh: "在应用的账单页面点两下即可取消。已付费的周期结束前仍可正常使用。",
        },
      },
      {
        q: {
          en: "Where is my data stored, and who can see it?",
          zh: "我的数据存放在哪里？谁能看到？",
        },
        a: {
          en: "Each workspace's data is kept separate and encrypted in transit and at rest. Only the members you invite can see it.",
          zh: "每个工作空间的数据彼此隔离，传输与存储全程加密，只有你邀请的成员可以访问。",
        },
      },
      {
        q: { en: "Which payment methods do you accept?", zh: "支持哪些付款方式？" },
        a: {
          en: "All major credit and debit cards, plus WeChat Pay and Alipay in mainland China. Business customers can also pay by invoice.",
          zh: "支持主流信用卡与借记卡，在中国大陆也可使用微信支付和支付宝。企业客户可按发票付款。",
        },
      },
      {
        q: { en: "Can I export my data?", zh: "可以导出我的数据吗？" },
        a: {
          en: "Yes. You can export everything in your workspace at any time, on every plan.",
          zh: "可以。所有套餐都支持随时导出工作空间中的全部数据。",
        },
      },
    ] satisfies Question[],
  },

  cta: {
    title: { en: "Bring your team over this week", zh: "这周就把团队带过来" },
    body: {
      en: "Set up takes minutes, and the Free plan is yours for as long as you like.",
      zh: "几分钟即可完成设置，免费版可一直使用。",
    },
    primary: { label: { en: "Start for free", zh: "免费开始" }, href: "app:/sign-in?mode=sign-up" },
    secondary: { label: { en: "Talk to us", zh: "联系我们" }, href: "/contact" },
  },

  nav: [
    { label: { en: "Features", zh: "功能" }, href: "/#features" },
    { label: { en: "Pricing", zh: "价格" }, href: "/pricing" },
    { label: { en: "FAQ", zh: "常见问题" }, href: "/faq" },
    { label: { en: "Blog", zh: "博客" }, href: "/blog" },
    { label: { en: "Contact", zh: "联系" }, href: "/contact" },
  ] satisfies Link[],

  account: {
    signIn: { en: "Sign in", zh: "登录" },
    getStarted: { en: "Get started", zh: "开始使用" },
    open: { en: "Open the app", zh: "进入应用" },
    menu: { en: "Menu", zh: "菜单" },
  },

  footer: {
    tagline: {
      en: "The workspace where your team plans, ships and grows.",
      zh: "团队规划、交付与增长的工作空间。",
    },
    columns: [
      {
        title: { en: "Product", zh: "产品" },
        links: [
          { label: { en: "Features", zh: "功能" }, href: "/#features" },
          { label: { en: "Pricing", zh: "价格" }, href: "/pricing" },
          { label: { en: "FAQ", zh: "常见问题" }, href: "/faq" },
          { label: { en: "Sign in", zh: "登录" }, href: "app:/sign-in" },
        ],
      },
      {
        title: { en: "Company", zh: "公司" },
        links: [
          { label: { en: "Blog", zh: "博客" }, href: "/blog" },
          { label: { en: "Contact", zh: "联系我们" }, href: "/contact" },
        ],
      },
      {
        title: { en: "Legal", zh: "法律" },
        links: [
          { label: { en: "Privacy", zh: "隐私政策" }, href: "/privacy" },
          { label: { en: "Terms", zh: "服务条款" }, href: "/terms" },
          { label: { en: "Cookies", zh: "Cookie 政策" }, href: "/cookies" },
          { label: { en: "Refunds", zh: "退款政策" }, href: "/refund" },
          { label: { en: "DPA", zh: "数据处理协议" }, href: "/dpa" },
        ],
      },
    ] satisfies { title: Copy; links: Link[] }[],
    rights: { en: "All rights reserved.", zh: "保留所有权利。" },
  },
};
