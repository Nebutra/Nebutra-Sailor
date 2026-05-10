/**
 * Provider registry metadata — single source of truth for the
 * create-sailor CLI and documentation generators.
 *
 * Coverage: 20 providers across direct labs, CN platforms, gateways,
 * inference accelerators, multimodal, local, and developer ecosystem.
 */

export type ProviderStatus = "opencode" | "ai-sdk" | "cn-compatible" | "pending";

export type ProviderCategory =
  | "直接实验室"
  | "国内平台"
  | "云平台"
  | "推理加速"
  | "统一网关"
  | "多模态"
  | "本地部署"
  | "开发者生态";

export interface ProviderMeta {
  id: string;
  name: string;
  category: ProviderCategory;
  status: ProviderStatus;
  docs: string;
  baseURL?: string;
  envVarPrefix: string;
  requiredEnvVars: string[];
}

export const PROVIDERS: ProviderMeta[] = [
  // ─── 直接实验室 ───────────────────────────────────────────────
  {
    id: "anthropic",
    name: "Anthropic",
    category: "直接实验室",
    status: "opencode",
    docs: "https://docs.anthropic.com",
    envVarPrefix: "ANTHROPIC",
    requiredEnvVars: ["ANTHROPIC_API_KEY"],
  },
  {
    id: "openai",
    name: "OpenAI",
    category: "直接实验室",
    status: "opencode",
    docs: "https://platform.openai.com/docs",
    envVarPrefix: "OPENAI",
    requiredEnvVars: ["OPENAI_API_KEY"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    category: "直接实验室",
    status: "opencode",
    docs: "https://platform.deepseek.com/api-docs",
    envVarPrefix: "DEEPSEEK",
    requiredEnvVars: ["DEEPSEEK_API_KEY"],
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    category: "直接实验室",
    status: "opencode",
    docs: "https://docs.x.ai/api",
    envVarPrefix: "XAI",
    requiredEnvVars: ["XAI_API_KEY"],
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    category: "直接实验室",
    status: "opencode",
    docs: "https://platform.moonshot.cn/docs",
    envVarPrefix: "MOONSHOT",
    requiredEnvVars: ["MOONSHOT_API_KEY", "MOONSHOT_BASE_URL"],
  },
  {
    id: "google",
    name: "Google Gemini",
    category: "直接实验室",
    status: "ai-sdk",
    docs: "https://ai.google.dev/gemini-api/docs",
    envVarPrefix: "GOOGLE_GENERATIVE_AI",
    requiredEnvVars: ["GOOGLE_GENERATIVE_AI_API_KEY"],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    category: "直接实验室",
    status: "ai-sdk",
    docs: "https://docs.mistral.ai",
    envVarPrefix: "MISTRAL",
    requiredEnvVars: ["MISTRAL_API_KEY"],
  },
  {
    id: "cohere",
    name: "Cohere",
    category: "直接实验室",
    status: "ai-sdk",
    docs: "https://docs.cohere.com",
    envVarPrefix: "COHERE",
    requiredEnvVars: ["COHERE_API_KEY"],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    category: "直接实验室",
    status: "cn-compatible",
    docs: "https://docs.perplexity.ai",
    baseURL: "https://api.perplexity.ai",
    envVarPrefix: "PERPLEXITY",
    requiredEnvVars: ["PERPLEXITY_API_KEY"],
  },
  {
    id: "ai21",
    name: "AI21 Labs",
    category: "直接实验室",
    status: "cn-compatible",
    docs: "https://docs.ai21.com",
    baseURL: "https://api.ai21.com/studio/v1",
    envVarPrefix: "AI21",
    requiredEnvVars: ["AI21_API_KEY"],
  },
  {
    id: "upstage",
    name: "Upstage (Solar)",
    category: "直接实验室",
    status: "cn-compatible",
    docs: "https://developers.upstage.ai/docs",
    baseURL: "https://api.upstage.ai/v1/solar",
    envVarPrefix: "UPSTAGE",
    requiredEnvVars: ["UPSTAGE_API_KEY"],
  },

  // ─── 国内平台 ───────────────────────────────────────────────
  {
    id: "siliconflow",
    name: "硅基流动 SiliconFlow",
    category: "国内平台",
    status: "cn-compatible",
    docs: "https://docs.siliconflow.cn",
    baseURL: "https://api.siliconflow.cn/v1",
    envVarPrefix: "SILICONFLOW",
    requiredEnvVars: ["SILICONFLOW_API_KEY"],
  },
  {
    id: "volcengine-ark",
    name: "火山引擎 ARK (豆包)",
    category: "国内平台",
    status: "cn-compatible",
    docs: "https://www.volcengine.com/docs/82379",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    envVarPrefix: "ARK",
    requiredEnvVars: ["ARK_API_KEY"],
  },
  {
    id: "bailian",
    name: "百炼 Bailian (通义)",
    category: "国内平台",
    status: "cn-compatible",
    docs: "https://help.aliyun.com/zh/model-studio",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    envVarPrefix: "DASHSCOPE",
    requiredEnvVars: ["DASHSCOPE_API_KEY"],
  },
  {
    id: "zhipu",
    name: "智谱 AI Zhipu",
    category: "国内平台",
    status: "ai-sdk",
    docs: "https://docs.bigmodel.cn",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    envVarPrefix: "ZHIPU",
    requiredEnvVars: ["ZHIPU_API_KEY"],
  },
  {
    id: "baichuan",
    name: "百川智能 Baichuan",
    category: "国内平台",
    status: "cn-compatible",
    docs: "https://platform.baichuan-ai.com/docs",
    baseURL: "https://api.baichuan-ai.com/v1",
    envVarPrefix: "BAICHUAN",
    requiredEnvVars: ["BAICHUAN_API_KEY"],
  },
  {
    id: "minimax",
    name: "MiniMax (ABAB)",
    category: "国内平台",
    status: "cn-compatible",
    docs: "https://platform.minimaxi.com/document/guides",
    baseURL: "https://api.minimax.chat/v1",
    envVarPrefix: "MINIMAX",
    requiredEnvVars: ["MINIMAX_API_KEY", "MINIMAX_GROUP_ID"],
  },
  {
    id: "stepfun",
    name: "阶跃星辰 StepFun",
    category: "国内平台",
    status: "cn-compatible",
    docs: "https://platform.stepfun.com/docs",
    baseURL: "https://api.stepfun.com/v1",
    envVarPrefix: "STEPFUN",
    requiredEnvVars: ["STEPFUN_API_KEY"],
  },
  {
    id: "sensetime",
    name: "商汤 SenseNova",
    category: "国内平台",
    status: "cn-compatible",
    docs: "https://platform.sensetime.com",
    baseURL: "https://api.sensenova.cn/v1",
    envVarPrefix: "SENSENOVA",
    requiredEnvVars: ["SENSENOVA_API_KEY"],
  },
  {
    id: "tencent",
    name: "腾讯混元 Hunyuan",
    category: "国内平台",
    status: "cn-compatible",
    docs: "https://cloud.tencent.com/document/product/1729",
    baseURL: "https://api.hunyuan.cloud.tencent.com/v1",
    envVarPrefix: "HUNYUAN",
    requiredEnvVars: ["HUNYUAN_API_KEY"],
  },
  {
    id: "lingyi",
    name: "零一万物 Yi",
    category: "国内平台",
    status: "cn-compatible",
    docs: "https://platform.lingyiwanwu.com/docs",
    baseURL: "https://api.lingyiwanwu.com/v1",
    envVarPrefix: "YI",
    requiredEnvVars: ["YI_API_KEY"],
  },

  // ─── 统一网关 ───────────────────────────────────────────────
  {
    id: "openrouter",
    name: "OpenRouter",
    category: "统一网关",
    status: "opencode",
    docs: "https://openrouter.ai/docs",
    envVarPrefix: "OPENROUTER",
    requiredEnvVars: ["OPENROUTER_API_KEY"],
  },
  {
    id: "vercel-gateway",
    name: "Vercel AI Gateway",
    category: "统一网关",
    status: "opencode",
    docs: "https://vercel.com/docs/ai-gateway",
    envVarPrefix: "AI_GATEWAY",
    requiredEnvVars: ["AI_GATEWAY_API_KEY"],
  },
  {
    id: "litellm",
    name: "LiteLLM Proxy",
    category: "统一网关",
    status: "cn-compatible",
    docs: "https://docs.litellm.ai",
    baseURL: "http://localhost:4000/v1",
    envVarPrefix: "LITELLM",
    requiredEnvVars: ["LITELLM_API_KEY"],
  },
  {
    id: "portkey",
    name: "Portkey",
    category: "统一网关",
    status: "cn-compatible",
    docs: "https://portkey.ai/docs",
    baseURL: "https://api.portkey.ai/v1",
    envVarPrefix: "PORTKEY",
    requiredEnvVars: ["PORTKEY_API_KEY"],
  },
  {
    id: "aws-bedrock",
    name: "AWS Bedrock",
    category: "云平台",
    status: "ai-sdk",
    docs: "https://aws.amazon.com/bedrock/",
    envVarPrefix: "AWS_BEDROCK",
    requiredEnvVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    category: "云平台",
    status: "ai-sdk",
    docs: "https://azure.microsoft.com/en-us/products/cognitive-services/openai-service/",
    envVarPrefix: "AZURE_OPENAI",
    requiredEnvVars: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"],
  },
  {
    id: "gcp-vertex",
    name: "GCP Vertex AI",
    category: "云平台",
    status: "ai-sdk",
    docs: "https://cloud.google.com/vertex-ai",
    envVarPrefix: "GOOGLE_VERTEX",
    requiredEnvVars: ["GOOGLE_APPLICATION_CREDENTIALS"],
  },

  // ─── 推理加速 ───────────────────────────────────────────────
  {
    id: "groq",
    name: "Groq",
    category: "推理加速",
    status: "opencode",
    docs: "https://console.groq.com/docs",
    envVarPrefix: "GROQ",
    requiredEnvVars: ["GROQ_API_KEY"],
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    category: "推理加速",
    status: "opencode",
    docs: "https://docs.fireworks.ai",
    envVarPrefix: "FIREWORKS",
    requiredEnvVars: ["FIREWORKS_API_KEY"],
  },
  {
    id: "together",
    name: "Together AI",
    category: "推理加速",
    status: "opencode",
    docs: "https://docs.together.ai",
    envVarPrefix: "TOGETHER",
    requiredEnvVars: ["TOGETHER_API_KEY"],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    category: "推理加速",
    status: "opencode",
    docs: "https://huggingface.co/docs/inference-providers",
    envVarPrefix: "HF",
    requiredEnvVars: ["HF_API_KEY"],
  },
  {
    id: "replicate",
    name: "Replicate",
    category: "推理加速",
    status: "cn-compatible",
    docs: "https://replicate.com/docs",
    envVarPrefix: "REPLICATE",
    requiredEnvVars: ["REPLICATE_API_TOKEN"],
  },
  {
    id: "lepton",
    name: "Lepton AI",
    category: "推理加速",
    status: "cn-compatible",
    docs: "https://www.lepton.ai/docs",
    baseURL: "https://api.lepton.ai/v1",
    envVarPrefix: "LEPTON",
    requiredEnvVars: ["LEPTON_API_KEY"],
  },
  {
    id: "anyscale",
    name: "Anyscale Endpoints",
    category: "推理加速",
    status: "cn-compatible",
    docs: "https://docs.endpoints.anyscale.com/",
    baseURL: "https://api.endpoints.anyscale.com/v1",
    envVarPrefix: "ANYSCALE",
    requiredEnvVars: ["ANYSCALE_API_KEY"],
  },
  {
    id: "octoai",
    name: "OctoAI",
    category: "推理加速",
    status: "cn-compatible",
    docs: "https://octoai.cloud/docs",
    baseURL: "https://text.octoai.run/v1",
    envVarPrefix: "OCTOAI",
    requiredEnvVars: ["OCTOAI_TOKEN"],
  },
  {
    id: "deepinfra",
    name: "DeepInfra",
    category: "推理加速",
    status: "cn-compatible",
    docs: "https://deepinfra.com/docs",
    baseURL: "https://api.deepinfra.com/v1/openai",
    envVarPrefix: "DEEPINFRA",
    requiredEnvVars: ["DEEPINFRA_API_KEY"],
  },
  {
    id: "novita",
    name: "Novita AI",
    category: "推理加速",
    status: "cn-compatible",
    docs: "https://novita.ai/docs",
    baseURL: "https://api.novita.ai/v3/openai",
    envVarPrefix: "NOVITA",
    requiredEnvVars: ["NOVITA_API_KEY"],
  },

  // ─── 多模态 ───────────────────────────────────────────────
  {
    id: "black-forest-labs",
    name: "Black Forest Labs (FLUX)",
    category: "多模态",
    status: "ai-sdk",
    docs: "https://docs.bfl.ml",
    envVarPrefix: "BFL",
    requiredEnvVars: ["BFL_API_KEY"],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs (TTS)",
    category: "多模态",
    status: "ai-sdk",
    docs: "https://elevenlabs.io/docs",
    envVarPrefix: "ELEVENLABS",
    requiredEnvVars: ["ELEVENLABS_API_KEY"],
  },
  {
    id: "runway",
    name: "Runway (Video)",
    category: "多模态",
    status: "pending",
    docs: "https://runwayml.com",
    envVarPrefix: "RUNWAY",
    requiredEnvVars: ["RUNWAY_API_KEY"],
  },
  {
    id: "luma",
    name: "Luma (Video)",
    category: "多模态",
    status: "pending",
    docs: "https://lumalabs.ai",
    envVarPrefix: "LUMA",
    requiredEnvVars: ["LUMA_API_KEY"],
  },
  {
    id: "midjourney",
    name: "Midjourney",
    category: "多模态",
    status: "pending",
    docs: "https://docs.midjourney.com",
    envVarPrefix: "MIDJOURNEY",
    requiredEnvVars: [],
  },

  // ─── 本地部署 ───────────────────────────────────────────────
  {
    id: "ollama",
    name: "Ollama (本地)",
    category: "本地部署",
    status: "opencode",
    docs: "https://github.com/ollama/ollama",
    baseURL: "http://localhost:11434/v1",
    envVarPrefix: "OLLAMA",
    requiredEnvVars: ["OLLAMA_BASE_URL"],
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    category: "本地部署",
    status: "cn-compatible",
    docs: "https://lmstudio.ai/docs",
    baseURL: "http://localhost:1234/v1",
    envVarPrefix: "LMSTUDIO",
    requiredEnvVars: [],
  },
  {
    id: "vllm",
    name: "vLLM",
    category: "本地部署",
    status: "cn-compatible",
    docs: "https://docs.vllm.ai",
    baseURL: "http://localhost:8000/v1",
    envVarPrefix: "VLLM",
    requiredEnvVars: [],
  },
  {
    id: "tgi",
    name: "HF TGI",
    category: "本地部署",
    status: "cn-compatible",
    docs: "https://huggingface.co/docs/text-generation-inference",
    baseURL: "http://localhost:8080/v1",
    envVarPrefix: "TGI",
    requiredEnvVars: [],
  },
];

export const PROVIDERS_BY_CATEGORY = PROVIDERS.reduce<Record<ProviderCategory, ProviderMeta[]>>(
  (acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  },
  {} as Record<ProviderCategory, ProviderMeta[]>,
);

export function getProvider(id: string): ProviderMeta | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export const isCNCompatible = (id: string): boolean => getProvider(id)?.status === "cn-compatible";
