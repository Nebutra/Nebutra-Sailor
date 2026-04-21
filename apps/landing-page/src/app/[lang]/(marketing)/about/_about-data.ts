// Bilingual content for About page extended sections.
// Chinese is the primary market (无锡/政务), English is for global audiences.

export type Bilingual<T> = { zh: T; en: T };
export const pick = <T>(lang: string, b: Bilingual<T>): T => (lang === "zh" ? b.zh : b.en);

// ─── Section: Company Overview Stats ─────────────────────────────────────────
export const OVERVIEW_STATS: ReadonlyArray<Bilingual<{ label: string; value: string }>> = [
  {
    zh: { label: "成立时间", value: "2025" },
    en: { label: "Founded", value: "2025" },
  },
  {
    zh: { label: "旗舰产品", value: "Nebutra Sailor" },
    en: { label: "Flagship", value: "Nebutra Sailor" },
  },
  {
    zh: { label: "核心业务", value: "AI 原生 SaaS + 数据智能" },
    en: { label: "Core Business", value: "AI-Native SaaS + Data Intelligence" },
  },
  {
    zh: { label: "技术路径", value: "开源 · 多租户 · Day 1 出海" },
    en: { label: "Approach", value: "Open Source · Multi-Tenant · Day-1 Global" },
  },
];

export const OVERVIEW_BLURB: Bilingual<string> = {
  zh: "云毓智能是一家极客驱动的 AI 原生初创企业。在 AI 能够极速生成代码（Vibe Coding）的今天，跨越数据安全、多租户高并发架构与全球化计费变现这「最后 10% 的工程鸿沟」，是每一位创业者的梦魇。我们的使命，便是帮您逾越这道鸿沟，将「技术演示」极速转化为可持续盈利的商业产品。",
  en: 'Nebutra is a geek-driven AI-native startup. In an era when AI can generate code at unprecedented speed (Vibe Coding), the real challenge is crossing the "last 10% engineering chasm" — data security, multi-tenant concurrency, and global monetization. Our mission is to bridge that chasm and transform technical demos into sustainable commercial products.',
};

// ─── Section: Business Portfolio (19 Capabilities in 4 Groups) ───────────────
type Capability = Bilingual<{ category: string; description: string }>;
type CapabilityGroup = {
  key: string;
  meta: Bilingual<{ title: string; subtitle: string }>;
  items: ReadonlyArray<Capability>;
};

export const CAPABILITY_GROUPS: ReadonlyArray<CapabilityGroup> = [
  {
    key: "modality",
    meta: {
      zh: { title: "A · 模态维度", subtitle: "数据生产的原材料覆盖" },
      en: { title: "A · Modality Dimensions", subtitle: "Coverage across raw data modalities" },
    },
    items: [
      {
        zh: { category: "多模态智能标注", description: "文本/图像/语音/视频/3D" },
        en: {
          category: "Multi-modal Annotation",
          description: "Text / Image / Audio / Video / 3D",
        },
      },
      {
        zh: { category: "政务文本自动化标注", description: "意图分类+实体抽取+情感标注" },
        en: {
          category: "Government Text Annotation",
          description: "Intent + Entity + Sentiment",
        },
      },
      {
        zh: { category: "城运视频自动化标注", description: "事件/违章/人员行为目标检测" },
        en: {
          category: "Urban Video Annotation",
          description: "Event / Violation / Behavior Detection",
        },
      },
      {
        zh: { category: "小语种语音标注", description: "多语种语音标注/合成/转写" },
        en: {
          category: "Low-resource Speech",
          description: "Multi-lingual ASR / TTS / Labeling",
        },
      },
      {
        zh: { category: "3D 高斯泼溅采集清洗", description: "3D 高斯泼溅+点云/网格标注" },
        en: {
          category: "3D Gaussian Splatting",
          description: "3DGS + Point Cloud / Mesh Labeling",
        },
      },
      {
        zh: { category: "QA 对数据采集清洗", description: "政企问答对采集与清洗" },
        en: {
          category: "QA Pair Curation",
          description: "Gov/Enterprise Q&A pair mining",
        },
      },
    ],
  },
  {
    key: "technology",
    meta: {
      zh: { title: "B · 技术能力", subtitle: "数据加工的技术底座" },
      en: { title: "B · Technology Stack", subtitle: "Technical foundations for data processing" },
    },
    items: [
      {
        zh: { category: "LLM、VLM 自动化标注", description: "LLM、VLM 预标+专家复审" },
        en: {
          category: "LLM/VLM Auto-labeling",
          description: "Pre-label + expert review",
        },
      },
      {
        zh: { category: "Agentic Coding 数据集", description: "多轮对话+工具调用数据集" },
        en: {
          category: "Agentic Coding Dataset",
          description: "Multi-turn + tool-call datasets",
        },
      },
      {
        zh: { category: "政务 RAG 语料建设", description: "政策问答向量知识图谱建设" },
        en: {
          category: "Government RAG Corpus",
          description: "Policy QA vector + knowledge graph",
        },
      },
      {
        zh: { category: "MCP/SKILL Agent 工作流", description: "定制智能体编排+工具调用" },
        en: {
          category: "MCP/Skill Agent Workflow",
          description: "Custom agent orchestration + tools",
        },
      },
    ],
  },
  {
    key: "platform",
    meta: {
      zh: { title: "C · 平台基础设施", subtitle: "承载数据的工程系统" },
      en: { title: "C · Platform Infrastructure", subtitle: "Engineering systems hosting data" },
    },
    items: [
      {
        zh: { category: "自研标注协同平台", description: "多租户全流程协同标注" },
        en: {
          category: "In-house Labeling Platform",
          description: "Multi-tenant collaborative annotation",
        },
      },
      {
        zh: { category: "开源 SaaS 全栈底座", description: "多租户 AI 原生 SaaS 底座" },
        en: {
          category: "Open-source SaaS Stack",
          description: "Multi-tenant AI-native foundation",
        },
      },
      {
        zh: { category: "AI 网关与算力调度", description: "多模型聚合+弹性算力调度" },
        en: {
          category: "AI Gateway & Compute",
          description: "Multi-model aggregation + elastic scheduling",
        },
      },
      {
        zh: { category: "政企私有化部署", description: "数据不出域本地化方案" },
        en: {
          category: "Private Deployment",
          description: "Data-sovereign on-premise solutions",
        },
      },
    ],
  },
  {
    key: "governance",
    meta: {
      zh: { title: "D · 数据治理", subtitle: "数据的管、用、流" },
      en: { title: "D · Data Governance", subtitle: "Manage, utilize, and circulate data" },
    },
    items: [
      {
        zh: { category: "数据质量管控体系", description: "准确率/召回率+双盲抽检" },
        en: {
          category: "Quality Control System",
          description: "Precision / Recall + blind sampling",
        },
      },
      {
        zh: { category: "数据合规治理", description: "分类分级+脱敏+审计日志" },
        en: {
          category: "Compliance Governance",
          description: "Classification + masking + audit trails",
        },
      },
      {
        zh: { category: "跨境数据合规治理", description: "多语种+数据出入境合规" },
        en: {
          category: "Cross-border Compliance",
          description: "Multi-lingual + data export compliance",
        },
      },
      {
        zh: { category: "场景数据共建孵化", description: "政企联合数据集共建" },
        en: {
          category: "Co-building Dataset Incubator",
          description: "Gov-enterprise joint dataset building",
        },
      },
      {
        zh: { category: "政务数据要素化", description: "数据资产目录+流通治理" },
        en: {
          category: "Data-as-Asset Operation",
          description: "Asset catalog + circulation governance",
        },
      },
    ],
  },
];

// ─── Section: Flagship Products (Sailor + Sleptons) ──────────────────────────
export type Product = Bilingual<{
  name: string;
  tagline: string;
  description: string;
  highlights: ReadonlyArray<{ title: string; desc: string }>;
}>;

export const PRODUCT_BUILDER_CORE: Product = {
  zh: {
    name: "Builder Core 企业级研发基座",
    tagline: "将数月企业级基建周期压缩至一周内交付的 AI 原生标准化引擎",
    description:
      "Builder Core 以开源项目 Sailor（云毓万象）为技术内核，将多租户隔离、权限体系、计费结算、合规审计等复杂业务微服务工程化、标准化。结合 AI Agent 结对编程与 Harness 工程（MCP/SKILL、A2A、Workflow Graphs、AI Gateway），为企业级研发交付提供可验证、可审计的工业化产出。",
    highlights: [
      { title: "Sailor 技术底座", desc: "开源 AI 原生 SaaS 全栈 · Next.js · 多模型矩阵" },
      { title: "标准化微服务", desc: "租户隔离 · 权限 · 计费 · 审计开箱即用" },
      { title: "Harness 工程", desc: "AI Gateway · MCP/SKILL · Agent 编排 · A2A 协同" },
      { title: "企业级交付保证", desc: "数月周期压缩至周级 · 可验证产出 · 可审计过程" },
    ],
  },
  en: {
    name: "Builder Core · Enterprise R&D Foundation",
    tagline:
      "AI-native standardized engine that compresses months of enterprise build cycles into a week",
    description:
      "Builder Core uses the open-source project Sailor (Nebutra Sailor) as its technical core, engineering multi-tenant isolation, permission systems, billing, and compliance auditing into standardized business microservices. Combined with AI Agent pair programming and Harness engineering (MCP/Skill, A2A, Workflow Graphs, AI Gateway), it delivers industrial-grade, verifiable, auditable enterprise R&D output.",
    highlights: [
      {
        title: "Sailor Technical Core",
        desc: "Open-source AI-native SaaS stack · Next.js · Multi-model",
      },
      {
        title: "Standardized Microservices",
        desc: "Tenancy · RBAC · Billing · Audit out-of-the-box",
      },
      { title: "Harness Engineering", desc: "AI Gateway · MCP/Skill · Agent orchestration · A2A" },
      {
        title: "Enterprise Delivery",
        desc: "Month-to-week cycle · Verifiable output · Auditable process",
      },
    ],
  },
};

export const PRODUCT_SLEPTONS: Product = {
  zh: {
    name: "Sleptons 人力与资源智能撮合引擎",
    tagline: "以代码图谱、技术栈与执行力曲线为基准的多维语义匹配平台",
    description:
      "Sleptons 颠覆传统招聘市场僵化的「中介撮合」与「JD-CV」逻辑，以工作量证明（Proof-of-Contribution）为根基，通过动态权益合约（Slicing Pie）与去中心化身份（DID）构建可追溯的权益体系。子模块 The Launchpad 基于客观业务数据（MRR、代码迭代密度、冷启动验证）进行自动化资源与算法资本倾斜，消除传统创投的 PPT 冗余损耗。",
    highlights: [
      { title: "工作量证明", desc: "代码图谱 · 技术栈组合 · 执行力曲线" },
      { title: "动态权益合约", desc: "Slicing Pie 股权模型 · 贡献自动清算" },
      { title: "去中心化身份", desc: "DID 跨平台凭证 · 可携带声誉" },
      { title: "The Launchpad 子模块", desc: "MRR / 代码密度 → 算法资本自动倾斜" },
    ],
  },
  en: {
    name: "Sleptons · Talent & Resource Matching Engine",
    tagline:
      "Multi-dimensional semantic matching based on code graphs, stack composition, and execution curves",
    description:
      'Sleptons overturns the rigid "intermediary matching" and "JD-CV" logic of traditional hiring markets. Built on Proof-of-Contribution, it establishes traceable equity through Slicing Pie dynamic contracts and Decentralized Identity (DID). The Launchpad submodule directs algorithmic capital based on objective business metrics — MRR, code iteration density, cold-start validation — eliminating the PPT overhead of traditional VC.',
    highlights: [
      {
        title: "Proof-of-Contribution",
        desc: "Code graphs · Stack composition · Execution curves",
      },
      { title: "Dynamic Equity", desc: "Slicing Pie model · Automatic contribution settlement" },
      {
        title: "Decentralized Identity",
        desc: "DID cross-platform credential · Portable reputation",
      },
      {
        title: "The Launchpad Submodule",
        desc: "MRR / code density → algorithmic capital routing",
      },
    ],
  },
};

export const PRODUCTS: ReadonlyArray<{ key: string; product: Product }> = [
  { key: "builder-core", product: PRODUCT_BUILDER_CORE },
  { key: "sleptons", product: PRODUCT_SLEPTONS },
];

/** @deprecated Use PRODUCT_BUILDER_CORE. Kept for backward-compat with earlier imports. */
export const PRODUCT_SAILOR = PRODUCT_BUILDER_CORE;
/** @deprecated Use PRODUCTS. */
export const PRODUCT = PRODUCT_BUILDER_CORE;

// ─── Section: Whitepaper Core Concepts ───────────────────────────────────────
// 核心引文 — 白皮书开篇
export const CORE_QUOTE: Bilingual<{ text: string; attribution: string }> = {
  zh: {
    text: "让包括人才、信任、信息、资本、创意、权力、欲望、需求、故事等等等等在内的所有生产要素，以前所未有的效率，去到全世界最适合他们的地方。",
    attribution: "— Nebutra 核心生态愿景",
  },
  en: {
    text: "Let every factor of production — talent, trust, information, capital, ideas, power, desires, needs, stories, and everything in between — flow to the place on earth most suited to it, at an efficiency never before seen.",
    attribution: "— Nebutra Core Ecosystem Vision",
  },
};

// 超级要素路由协议 — 三类生产要素
export const OMNI_FACTOR_GROUPS: ReadonlyArray<
  Bilingual<{ category: string; subtitle: string; description: string }>
> = [
  {
    zh: {
      category: "实体与资本要素",
      subtitle: "Substance & Capital",
      description:
        "打破地缘与阶层，让人才与真实需求实现数据驱动的精准对接；消除 VC 信息差，让聪明且高效的资本自动流向具有真实代码产出的项目。",
    },
    en: {
      category: "Substance & Capital",
      subtitle: "实体与资本要素",
      description:
        "Break through geography and class: match talent with real demand via data. Close the VC information gap: route efficient capital toward projects with verifiable code output.",
    },
  },
  {
    zh: {
      category: "权力与信任要素",
      subtitle: "Power & Trust",
      description:
        "将信任的建立从传统的「大厂背书」与「名校标签」中剥离，重构于不可篡改的工程产出与工作量证明（Proof of Work）之上。",
    },
    en: {
      category: "Power & Trust",
      subtitle: "权力与信任要素",
      description:
        'Detach trust from "big-company pedigree" and "elite-school labels," and rebuild it on immutable engineering output and Proof of Work.',
    },
  },
  {
    zh: {
      category: "原动力要素",
      subtitle: "Primary Drive",
      description:
        "对创意、欲望、故事与意志进行算法识别与分发，让纯粹的改变世界的冲动，与具备顶级执行力的超级个体发生有效共振。",
    },
    en: {
      category: "Primary Drive",
      subtitle: "原动力要素",
      description:
        "Algorithmically identify and distribute ideas, desires, stories, and will — pairing the pure impulse to change the world with high-execution super individuals.",
    },
  },
];

// 组织演进准则 — 白皮书 Ⅳ
export const ORGANIZATION_PRINCIPLES: ReadonlyArray<
  Bilingual<{ number: string; title: string; description: string }>
> = [
  {
    zh: {
      number: "01",
      title: "以 AI 自动化为唯一解法",
      description:
        "坚决抵制通过堆叠人力、增加管理层级来应对业务复杂性。所有规模化问题，都必须回到「提升人效上限」与「AI 自动化程度」这两个唯一可接受的答案。",
    },
    en: {
      number: "01",
      title: "AI Automation as the Only Answer",
      description:
        "Refuse to respond to complexity by piling on headcount or management layers. Every scaling problem must return to the two acceptable answers — raising the per-person ceiling, and raising AI automation depth.",
    },
  },
  {
    zh: {
      number: "02",
      title: "代码与系统治理取代人治",
      description:
        "将一切标准化的运营、测试、内部流转交由 AI Agent 执行。从根源上减少复杂低效、利益冲突与内部摩擦，让组织的治理逻辑沉淀为可审计的代码与系统。",
    },
    en: {
      number: "02",
      title: "Code & System Governance Over Human Rule",
      description:
        "Delegate standardized operations, testing, and internal flows to AI Agents. Reduce inefficiency, conflict of interest, and internal friction at the root by embedding governance logic as auditable code and systems.",
    },
  },
  {
    zh: {
      number: "03",
      title: "捍卫创造力的纯粹性",
      description:
        "让人类心智聚焦于最高价值的战略洞察、架构创新与真实交付。组织的稀缺资源保留给不可自动化的判断与创造，保障长期竞争力。",
    },
    en: {
      number: "03",
      title: "Preserve Creative Purity",
      description:
        "Keep human cognition focused on the highest-value strategic insight, architectural innovation, and real delivery. Reserve scarce organizational resources for judgment and creativity that cannot be automated.",
    },
  },
];

// 元独角兽 · 无限裂变 · OPC — Mission section 关键术语
export const META_UNICORN_THESIS: Bilingual<{
  headline: string;
  thesis: string;
  paradigm: string;
}> = {
  zh: {
    headline: "元独角兽（Meta-Unicorn）生态",
    thesis:
      "Nebutra 的目标不是成为一家独角兽，而是成为一台能够持续赋能、孵化并裂变出无数超级个体与一人公司（OPC）的母体引擎。我们摒弃传统商业世界「无限扩张、人员臃肿」的旧范式，为每一家从 Nebutra 走出的公司植入「无限裂变」的底层基因。",
    paradigm:
      "终极的社会级使命是打破权威壁垒与系统性偏见，让创业变得智能化、轻量化、民主化——使「构建并运营一家高利润数字公司」的确定性与吸引力，比肩甚至超越考研、考公、进国企与入职大厂，成为顶尖创造者的首选职业范式。",
  },
  en: {
    headline: "The Meta-Unicorn Ecosystem",
    thesis:
      'Nebutra\'s goal is not to become a unicorn, but to become the mother engine that continuously enables, incubates, and fissions countless super individuals and One-Person Companies (OPC). We reject the old paradigm of "scale through headcount" and embed "infinite fission" as the foundational genetic trait of every company that emerges from Nebutra.',
    paradigm:
      'Our ultimate social mission is to break authority barriers and systemic bias — to make entrepreneurship intelligent, lightweight, and democratic. The certainty and appeal of "building and operating a high-margin digital company" should match or surpass postgraduate exams, civil service, state enterprises, or big-tech employment — becoming the first-choice career path for top creators.',
  },
};

// ─── Section: Harness Evolution Timeline (AI Stack 三层演化) ──────────────────
export const HARNESS_TIMELINE: ReadonlyArray<
  Bilingual<{ year: string; layer: string; themes: ReadonlyArray<string> }>
> = [
  {
    zh: {
      year: "2022",
      layer: "Weights 层",
      themes: [
        "Pretraining",
        "RLHF",
        "Fine-tuning",
        "Scaling Law",
        "Alignment",
        "Instruction-following",
        "Few-shot",
      ],
    },
    en: {
      year: "2022",
      layer: "Weights Layer",
      themes: [
        "Pretraining",
        "RLHF",
        "Fine-tuning",
        "Scaling Law",
        "Alignment",
        "Instruction-following",
        "Few-shot",
      ],
    },
  },
  {
    zh: {
      year: "2023–2024",
      layer: "Context 层",
      themes: [
        "RAG",
        "Memory",
        "Long Context",
        "Prompting",
        "Chain-of-Thought",
        "Knowledge Injection",
        "Context Engineering",
      ],
    },
    en: {
      year: "2023–2024",
      layer: "Context Layer",
      themes: [
        "RAG",
        "Memory",
        "Long Context",
        "Prompting",
        "Chain-of-Thought",
        "Knowledge Injection",
        "Context Engineering",
      ],
    },
  },
  {
    zh: {
      year: "2025–2026",
      layer: "Harness 层 ← Nebutra 的战场",
      themes: [
        "MCP/SKILL",
        "Function Calling",
        "Tool Ecosystems",
        "Workflow Graphs",
        "Protocols",
        "Multi-agent",
        "A2A",
        "Orchestration",
        "Security",
        "Agent Infrastructure",
      ],
    },
    en: {
      year: "2025–2026",
      layer: "Harness Layer ← Nebutra's battlefield",
      themes: [
        "MCP/Skill",
        "Function Calling",
        "Tool Ecosystems",
        "Workflow Graphs",
        "Protocols",
        "Multi-agent",
        "A2A",
        "Orchestration",
        "Security",
        "Agent Infrastructure",
      ],
    },
  },
];

// ─── Section: Triple Vision (创业智能化、轻量化、民主化) ─────────────────────
export const TRIPLE_VISION: ReadonlyArray<Bilingual<{ keyword: string; statement: string }>> = [
  {
    zh: {
      keyword: "智能化",
      statement: "让 AI-Native 基础设施成为创业者的默认生产力，而非奢侈品。",
    },
    en: {
      keyword: "Intelligent",
      statement:
        "Make AI-native infrastructure the default productivity layer for founders, not a luxury.",
    },
  },
  {
    zh: {
      keyword: "轻量化",
      statement: "用开源 SaaS 底座 + 制度设计，让一人公司与极客团队也能跨越「最后 10% 工程鸿沟」。",
    },
    en: {
      keyword: "Lightweight",
      statement:
        'Let solo founders and geek teams cross the "last 10% engineering chasm" with open-source SaaS + institutional design.',
    },
  },
  {
    zh: {
      keyword: "民主化",
      statement: "用信任机器 + 贡献量化，把创业从豪赌变成有章可循、有据可依的探索。",
    },
    en: {
      keyword: "Democratic",
      statement:
        "With trust machines and contribution quantification, transform entrepreneurship from a gamble into a traceable, verifiable exploration.",
    },
  },
];

// ─── Section: Three Business Pillars ─────────────────────────────────────────
export const PILLARS: ReadonlyArray<
  Bilingual<{ number: string; title: string; description: string }>
> = [
  {
    zh: {
      number: "01",
      title: "企业级敏捷底层基座",
      description:
        "为商业客户私有化部署全栈业务中枢与 AI 引擎。Sailor 提供从身份认证、计费、多租户到 AI 网关的完整基础设施，让客户专注业务创新。",
    },
    en: {
      number: "01",
      title: "Enterprise Agile Foundation",
      description:
        "Private deployment of full-stack business engine and AI runtime for commercial clients. Sailor delivers complete infrastructure — auth, billing, multi-tenancy, AI Gateway — so clients focus on business innovation.",
    },
  },
  {
    zh: {
      number: "02",
      title: "Vibe Business 联合孵化",
      description:
        '面向海外市场赋能优秀创业者极速验证商业直觉，共同孵化具备高人效杠杆的下一代"独角兽"项目。我们是您最可靠的技术合伙人。',
    },
    en: {
      number: "02",
      title: "Vibe Business Incubation",
      description:
        "Empower global founders to rapidly validate commercial intuition and co-incubate the next unicorn with high human-leverage. We are your most reliable technical co-founder.",
    },
  },
  {
    zh: {
      number: "03",
      title: "数智化深度定制",
      description:
        "将底层技术与业务流深度结合，赋能垂直实体与政企单位完成数字化重构。从数据采集、标注、治理到 AI 应用端到端交付。",
    },
    en: {
      number: "03",
      title: "Digital Intelligence Customization",
      description:
        "Deeply combine foundational tech with business workflows for vertical enterprises and government. End-to-end delivery from data collection, annotation, governance to AI applications.",
    },
  },
];

// ─── Section: R&D Innovation ─────────────────────────────────────────────────
export const INNOVATION_PILLARS: ReadonlyArray<Bilingual<{ title: string; description: string }>> =
  [
    {
      zh: {
        title: "AI 原生架构",
        description:
          "所有产品从第一行代码起即面向 AI 时代设计。MCP Agent 工作流、RAG 向量检索、多模型聚合网关作为一等公民。",
      },
      en: {
        title: "AI-Native Architecture",
        description:
          "Every product designed for the AI era from line one. MCP Agent workflows, RAG retrieval, and multi-model gateways as first-class citizens.",
      },
    },
    {
      zh: {
        title: "开源基础设施",
        description: "Sailor 全栈开源。我们坚信在加速度时代，开放的生态比专有技术更有复利。",
      },
      en: {
        title: "Open-source Infrastructure",
        description:
          "Sailor is open-source end-to-end. We believe open ecosystems compound more than proprietary stacks.",
      },
    },
    {
      zh: {
        title: "工程最佳实践",
        description:
          "对标硅谷最佳实践 — TDD、PPR、Edge-first、可观测性内建。我们相信工程品味决定产品生死。",
      },
      en: {
        title: "Engineering Best Practices",
        description:
          "Benchmarked against Silicon Valley standards — TDD, PPR, Edge-first, built-in observability. Engineering taste is what separates winners from losers.",
      },
    },
  ];

// ─── Section: Global Presence ────────────────────────────────────────────────
export const GLOBAL_POINTS: ReadonlyArray<
  Bilingual<{ icon: string; title: string; desc: string }>
> = [
  {
    zh: { icon: "🌍", title: "7 大主干语种", desc: "中英日韩西法德原生国际化" },
    en: {
      icon: "🌍",
      title: "7 Primary Languages",
      desc: "Native i18n across ZH/EN/JA/KO/ES/FR/DE",
    },
  },
  {
    zh: { icon: "📜", title: "跨境数据合规", desc: "GDPR、CLOUD Act、数据出境安全评估" },
    en: {
      icon: "📜",
      title: "Cross-border Compliance",
      desc: "GDPR · CLOUD Act · Data export assessment",
    },
  },
  {
    zh: { icon: "💳", title: "多地区支付", desc: "Stripe、LemonSqueezy、Polar、Alipay" },
    en: {
      icon: "💳",
      title: "Multi-region Payments",
      desc: "Stripe · LemonSqueezy · Polar · Alipay",
    },
  },
  {
    zh: { icon: "⚡", title: "全球 Edge", desc: "Vercel Edge Network · 全球 CDN · 毫秒级响应" },
    en: { icon: "⚡", title: "Global Edge", desc: "Vercel Edge · Global CDN · ms-level response" },
  },
];
