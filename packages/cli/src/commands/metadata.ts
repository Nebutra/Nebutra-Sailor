/**
 * CLI Command Metadata
 *
 * Describes all commands available in the Nebutra governance CLI.
 * Used both for generating documentation and providing structured help.
 *
 * This is the single source of truth for CLI command documentation.
 */

export interface CommandArgument {
  name: string;
  description: string;
  required: boolean;
  variadic?: boolean;
}

export interface CommandOption {
  flags: string;
  description: string;
  default?: string | boolean;
}

export interface CommandExample {
  command: string;
  description: string;
}

export interface CommandMeta {
  name: string;
  description: string;
  usage?: string;
  arguments?: CommandArgument[];
  options?: CommandOption[];
  examples?: CommandExample[];
  subcommands?: CommandMeta[];
}

export const createSailorValueDomains = {
  pm: ["npm", "pnpm", "yarn", "bun"],
  region: ["global", "cn", "hybrid"],
  orm: ["prisma", "drizzle", "none"],
  db: ["postgres", "mysql", "sqlite", "none"],
  auth: ["clerk", "betterauth", "none"],
  socialLogin: ["wechat", "qq", "dingtalk", "workweixin", "feishu", "weibo"],
  payment: ["stripe", "lemon", "wechat", "alipay", "none"],
  ai: [
    "openai",
    "anthropic",
    "deepseek",
    "xai",
    "moonshot",
    "google",
    "mistral",
    "cohere",
    "perplexity",
    "ai21",
    "upstage",
    "siliconflow",
    "volcengine-ark",
    "bailian",
    "zhipu",
    "baichuan",
    "minimax",
    "stepfun",
    "sensetime",
    "tencent",
    "lingyi",
    "openrouter",
    "vercel-gateway",
    "litellm",
    "portkey",
    "aws-bedrock",
    "azure-openai",
    "gcp-vertex",
    "groq",
    "fireworks",
    "together",
    "huggingface",
    "replicate",
    "lepton",
    "anyscale",
    "octoai",
    "deepinfra",
    "novita",
    "custom",
    "none",
  ],
  deploy: ["vercel", "railway", "cloudflare", "selfhost", "none"],
  docs: ["fumadocs", "mintlify", "docusaurus", "nextra", "vitepress", "none"],
  email: ["resend", "postmark", "ses", "aliyun-dm", "tencent-ses", "netease", "none"],
  storage: ["r2", "s3", "supabase-storage", "aliyun-oss", "tencent-cos", "qiniu", "none"],
  monitoring: ["sentry", "datadog", "bugsnag", "aliyun-arms", "tingyun", "none"],
  analytics: ["posthog", "plausible", "umami", "mixpanel", "baidu", "sensors", "growingio", "none"],
  sms: ["twilio", "messagebird", "plivo", "aliyun-sms", "tencent-sms", "yunpian", "none"],
  queue: ["qstash", "bullmq", "upstash", "sqs", "none"],
  search: ["meilisearch", "typesense", "algolia", "pgvector", "none"],
  cache: ["upstash-redis", "vercel-kv", "redis", "dragonfly", "none"],
  notifications: ["novu", "knock", "custom", "none"],
  webhooks: ["svix", "custom", "none"],
  cms: ["sanity", "contentful", "strapi", "none"],
  featureFlags: ["vercel-flags", "growthbook", "configcat", "none"],
  captcha: ["turnstile", "hcaptcha", "aliyun-slide", "none"],
  mcp: ["on", "off"],
  metering: ["auto", "on", "off"],
  billingMode: ["usage", "seat", "credits"],
  idp: ["clerk", "oauth-server"],
} as const;

export const createSailorCommandOptions: CommandOption[] = [
  { flags: "-p, --pm <id>", description: "Package manager: npm, pnpm, yarn, or bun" },
  { flags: "--region <id>", description: "Target region: global, cn, or hybrid" },
  { flags: "--orm <id>", description: "ORM: prisma, drizzle, or none" },
  { flags: "--db <id>", description: "Database: postgres, mysql, sqlite, or none" },
  { flags: "--auth <id>", description: "Auth provider: clerk, betterauth, or none" },
  {
    flags: "--social-login <ids>",
    description: "Comma-separated CN social login providers",
  },
  {
    flags: "--payment <id>",
    description: "Payment provider: stripe, lemon, wechat, alipay, or none",
  },
  { flags: "--ai <ids>", description: "Expert/non-interactive AI provider seed ids" },
  {
    flags: "--deploy <target>",
    description: "Deploy target: vercel, railway, cloudflare, selfhost, or none",
  },
  {
    flags: "--docs <id>",
    description: "Docs framework: fumadocs, mintlify, docusaurus, nextra, vitepress, or none",
  },
  { flags: "--email <id>", description: "Transactional email provider" },
  { flags: "--storage <id>", description: "Object storage provider" },
  { flags: "--monitoring <id>", description: "Monitoring provider" },
  { flags: "--analytics <id>", description: "Analytics provider" },
  { flags: "--sms <id>", description: "SMS provider" },
  { flags: "--queue <id>", description: "Queue provider" },
  { flags: "--search <id>", description: "Search provider" },
  { flags: "--cache <id>", description: "Cache provider" },
  { flags: "--notifications <id>", description: "Notifications provider" },
  { flags: "--webhooks <id>", description: "Outbound webhooks provider" },
  { flags: "--cms <id>", description: "Headless CMS provider" },
  { flags: "--feature-flags <id>", description: "Feature flag provider" },
  { flags: "--captcha <id>", description: "Captcha provider" },
  { flags: "--mcp <mode>", description: "MCP server mode: on or off" },
  { flags: "--metering <mode>", description: "Metering mode: auto, on, or off" },
  { flags: "--billing-mode <mode>", description: "Billing mode: usage, seat, or credits" },
  { flags: "--idp <id>", description: "Identity provider: clerk or oauth-server" },
  { flags: "--i18n", description: "Enable i18n", default: true },
  { flags: "--no-i18n", description: "Disable i18n" },
  { flags: "--no-install", description: "Skip package install" },
  { flags: "--no-git", description: "Skip git init" },
  {
    flags: "--dry-run",
    description: "Preview project scaffolding without creating files (exit code 10)",
  },
  { flags: "--json", description: "Emit machine-readable JSON events" },
  { flags: "--yes", description: "Skip all interactive prompts (Agent mode)" },
];

/**
 * Nebutra CLI - Governance and Platform Operations
 */
export const nebultraCommand: CommandMeta = {
  name: "nebutra",
  description:
    "Governance-first CLI for Nebutra Sailor scaffolding, registry-backed features, and platform operations",
  usage: "nebutra [command] [options]",
  options: [
    {
      flags: "--format <type>",
      description: "Output format: json, table, plain",
    },
    {
      flags: "--yes, --no-interactive",
      description: "Skip all interactive prompts (Agent mode)",
    },
    {
      flags: "--no-color",
      description: "Disable colored output",
    },
    {
      flags: "--verbose",
      description: "Enable verbose output",
    },
    {
      flags: "--quiet",
      description: "Suppress non-essential output",
    },
  ],
  subcommands: [
    {
      name: "init",
      description: "Initialize a Nebutra project and create nebutra.config.json",
      usage: "nebutra init [options]",
      options: [
        {
          flags: "--dry-run",
          description: "Preview changes without writing files (exits with code 10)",
        },
        {
          flags: "--yes",
          description: "Skip all interactive prompts (Agent mode)",
        },
        {
          flags: "--if-not-exists",
          description: "Skip initialization if nebutra.config.json already exists",
        },
      ],
      arguments: [],
      examples: [
        {
          command: "nebutra init",
          description: "Initialize Nebutra configuration in the current directory",
        },
        {
          command: "nebutra init --dry-run",
          description: "Preview initialization changes without writing files",
        },
        {
          command: "nebutra init --yes --if-not-exists",
          description: "Initialize without prompts, skip if already configured",
        },
      ],
    },
    {
      name: "add",
      description: "Add a registry-backed platform feature or external UI component",
      usage: "nebutra add [components...] [options]",
      arguments: [
        {
          name: "components",
          description: "Local feature names to install from the Nebutra registry",
          required: false,
          variadic: true,
        },
      ],
      options: [
        {
          flags: "--21st <id>",
          description: "Fetch and install a component from 21st.dev registry",
        },
        {
          flags: "--v0 <url>",
          description: "Fetch and install a component from v0.dev by URL",
        },
        {
          flags: "--dry-run",
          description: "Preview what would be installed without making changes (exit code 10)",
        },
        {
          flags: "--yes",
          description: "Skip all interactive prompts and use defaults (Agent mode)",
        },
        {
          flags: "--if-not-exists",
          description: "Skip installation if component already exists",
        },
      ],
      examples: [
        {
          command: "nebutra add cache --provider upstash-redis --yes",
          description: "Install the local cache feature with the Upstash Redis provider",
        },
        {
          command: "nebutra add --21st button-01",
          description: "Add a component from 21st.dev (shadcn-style registry)",
        },
        {
          command: 'nebutra add --v0 "https://v0.dev/r/..." --dry-run',
          description: "Preview adding a component from v0.dev without making changes",
        },
        {
          command: "nebutra add webhooks --provider svix --yes --if-not-exists",
          description: "Install webhooks without prompts, skip if already configured",
        },
      ],
    },
    {
      name: "create",
      description: "Scaffold a topology-first Nebutra Sailor project with governed defaults",
      usage: "nebutra create [dir] [options]",
      arguments: [
        {
          name: "dir",
          description:
            "Target directory for the new project (optional, will prompt if not provided)",
          required: false,
        },
      ],
      options: createSailorCommandOptions,
      examples: [
        {
          command: "nebutra create my-saas-app --region=hybrid --ai=openai,deepseek",
          description:
            "Create a topology-first project with hybrid defaults and selected AI providers",
        },
        {
          command:
            "nebutra create my-cn-app --region=cn --payment=wechat --storage=aliyun-oss --deploy=selfhost -y",
          description: "Create a non-interactive China-ready scaffold",
        },
        {
          command: "nebutra create my-app --storage=supabase-storage --dry-run --json",
          description: "Preview scaffolding with structured JSON output",
        },
      ],
    },
    {
      name: "mcp",
      description: "Start the Nebutra MCP server for AI agents and editors",
      usage: "nebutra mcp [options]",
      arguments: [],
      options: [
        {
          flags: "--stdio",
          description: "Use stdio transport for communication (default: enabled)",
          default: true,
        },
        {
          flags: "--verbose",
          description: "Enable verbose logging for MCP server",
        },
      ],
      examples: [
        {
          command: "nebutra mcp",
          description: "Start the MCP server for AI-powered project context integration",
        },
        {
          command: "nebutra mcp --verbose",
          description: "Start the MCP server with detailed logging output",
        },
      ],
    },
    {
      name: "schema",
      description: "Show command schema and argument documentation (Agent-friendly JSON output)",
      usage: "nebutra schema [command] [options]",
      arguments: [
        {
          name: "command",
          description: "Command name to show schema for (e.g., init, add, create)",
          required: false,
        },
      ],
      options: [
        {
          flags: "--all",
          description: "Show full schema for all commands as JSON",
          default: false,
        },
        {
          flags: "--list",
          description: "List all available command names",
          default: false,
        },
        {
          flags: "--exit-codes",
          description: "Show exit codes reference",
          default: false,
        },
      ],
      examples: [
        {
          command: "nebutra schema --all",
          description: "Show complete JSON of all commands, args, options, value domains",
        },
        {
          command: "nebutra schema init",
          description: "Show schema for init command (arguments, options, defaults, examples)",
        },
        {
          command: "nebutra schema add",
          description: "Show schema for add command with enum values",
        },
        {
          command: "nebutra schema --list",
          description: "List just the command names (quick discovery)",
        },
        {
          command: "nebutra schema --exit-codes",
          description: "Show exit codes reference for all possible exit codes",
        },
      ],
    },
    {
      name: "brand",
      description: "Manage governed brand tokens, palettes, and visual system outputs",
      usage: "nebutra brand [subcommand]",
      examples: [
        {
          command: "nebutra brand palette --primary=#0047FF",
          description: "Generate a token-aligned blue palette",
        },
      ],
    },
    {
      name: "i18n",
      description: "Manage localization files and multilingual product copy",
      usage: "nebutra i18n [subcommand]",
    },
    {
      name: "infra",
      description: "Manage local infrastructure services for Nebutra development",
      usage: "nebutra infra [subcommand]",
      examples: [
        {
          command: "nebutra infra up --lite",
          description: "Start lightweight local infrastructure",
        },
      ],
    },
    {
      name: "env",
      description: "Validate and manage environment variables across apps and packages",
      usage: "nebutra env [subcommand]",
    },
    {
      name: "license",
      description: "Manage Nebutra Sailor commercial license activation and status",
      usage: "nebutra license [subcommand]",
      arguments: [],
      options: [],
      subcommands: [
        {
          name: "activate",
          description: "Activate a commercial license key for local development",
          usage: "nebutra license activate <key>",
          arguments: [
            {
              name: "key",
              description: "Your Nebutra Sailor commercial license key",
              required: true,
            },
          ],
          options: [
            {
              flags: "--quiet",
              description: "Suppress output",
            },
          ],
          examples: [
            {
              command: "nebutra license activate liz_1234567890",
              description: "Activate your license key globally",
            },
          ],
        },
        {
          name: "status",
          description: "Check the locally configured license status",
          usage: "nebutra license status",
          arguments: [],
          options: [
            {
              flags: "--quiet",
              description: "Suppress output",
            },
          ],
          examples: [
            {
              command: "nebutra license status",
              description: "Check if you have an active license",
            },
          ],
        },
      ],
    },
    {
      name: "ai",
      description: "Configure AI providers, gateway routing, and agent-ready defaults",
      usage: "nebutra ai [subcommand]",
    },
    {
      name: "auth",
      description: "Configure authentication providers and tenant access defaults",
      usage: "nebutra auth [subcommand]",
    },
    {
      name: "billing",
      description: "Manage billing providers, subscriptions, usage, and return flows",
      usage: "nebutra billing [subcommand]",
    },
    {
      name: "stats",
      description: "Show monorepo statistics, health signals, and platform inventory",
      usage: "nebutra stats [options]",
    },
    {
      name: "db",
      description: "Manage database schema, migrations, seeds, and generated clients",
      usage: "nebutra db [subcommand]",
    },
    {
      name: "generate",
      description: "Generate apps, modules, API surfaces, and typed project artifacts",
      usage: "nebutra generate [type] [name]",
    },
    {
      name: "preset",
      description: "List and apply topology presets for governed SaaS projects",
      usage: "nebutra preset [subcommand]",
    },
    {
      name: "dev",
      description: "Start development workflows for selected Nebutra apps or presets",
      usage: "nebutra dev [options]",
    },
    {
      name: "test",
      description: "Run unit, architecture, and E2E verification workflows",
      usage: "nebutra test [scope]",
    },
    {
      name: "admin",
      description: "Operate tenant, platform health, and administrative workflows",
      usage: "nebutra admin [subcommand]",
    },
    {
      name: "community",
      description: "Inspect community health, showcases, and external adoption signals",
      usage: "nebutra community [subcommand]",
    },
    {
      name: "growth",
      description: "Analyze product growth, funnels, retention, and lifecycle signals",
      usage: "nebutra growth [subcommand]",
    },
    {
      name: "ecosystem",
      description: "Manage template marketplace, ideas, project showcase, and ecosystem sync",
      usage: "nebutra ecosystem [subcommand]",
    },
    {
      name: "services",
      description: "Inspect and manage microservice health, logs, scaling, and rollouts",
      usage: "nebutra services [subcommand]",
    },
    {
      name: "search",
      description: "Manage search indexes, reindexing, and search diagnostics",
      usage: "nebutra search [subcommand]",
    },
    {
      name: "secrets",
      description: "Manage encrypted tenant and platform secrets",
      usage: "nebutra secrets [subcommand]",
    },
    {
      name: "completions",
      description: "Generate shell completions for the current Nebutra command surface",
      usage: "nebutra completions [shell]",
      arguments: [
        {
          name: "shell",
          description: "Shell to generate completions for: bash, zsh, fish, or install",
          required: false,
        },
      ],
    },
    {
      name: "doctor",
      description: "Check local project setup and common Nebutra configuration issues",
      usage: "nebutra doctor",
    },
  ],
};

/**
 * create-sailor CLI - Project Scaffolding Tool
 */
export const createSailorCommand: CommandMeta = {
  name: "create-sailor",
  description: "Topology-first project generator for governed Nebutra Sailor SaaS scaffolds",
  usage: "create-sailor [dir]",
  arguments: [
    {
      name: "dir",
      description:
        "Target directory to initialize the project in (optional, will prompt if not provided)",
      required: false,
    },
  ],
  options: [],
  examples: [
    {
      command: "create-sailor my-project",
      description: "Create a new Nebutra-Sailor project in the my-project directory",
    },
    {
      command: "create-sailor",
      description: "Create a new project with interactive prompts for all configuration options",
    },
    {
      command: "npm create sailor my-startup",
      description: "Alternative syntax: use npm create to run the create-sailor CLI",
    },
  ],
};

/**
 * nebutra-mcp CLI - MCP Server for AI Integration
 */
export const nebutraMcpCommand: CommandMeta = {
  name: "nebutra-mcp",
  description:
    "Model Context Protocol (MCP) server that exposes Nebutra project structure and tools to AI agents and editors",
  usage: "nebutra-mcp",
  arguments: [],
  options: [],
  examples: [
    {
      command: "nebutra mcp",
      description: "Start the MCP server via the nebutra CLI",
    },
  ],
};

/**
 * All CLI commands
 */
export const allCommands: CommandMeta[] = [nebultraCommand, createSailorCommand, nebutraMcpCommand];
