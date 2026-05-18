export type BlogShareRegion = "global" | "mainland-china";
export type BlogShareCategory = "mainstream" | "hacker";
export type BlogShareAction = "intent" | "copy";
export type BlogShareComplianceZone = "global" | "cn";

export type BlogSharePayload = {
  url: string;
  title: string;
  excerpt?: string | null;
};

export type BlogSharePlatform = {
  id: string;
  name: string;
  region: BlogShareRegion;
  category: BlogShareCategory;
  complianceZone: BlogShareComplianceZone;
  iconSlug?: string;
  iconifyIcon?: string;
  fallbackGlyph: string;
  action: BlogShareAction;
  buildIntentUrl?: (payload: BlogSharePayload) => string;
};

export type BlogShareGroup = {
  id: string;
  label: { en: string; zh: string };
  platforms: BlogSharePlatform[];
};

function encode(value: string): string {
  return encodeURIComponent(value);
}

function shareText(payload: BlogSharePayload): string {
  return [payload.title, payload.excerpt, payload.url].filter(Boolean).join("\n\n");
}

export function getBlogShareText(payload: BlogSharePayload): string {
  return shareText(payload);
}

export function getSimpleIconUrl(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}/4b5563`;
}

export function getIconifyIconUrl(icon: string): string {
  return `https://api.iconify.design/${icon}.svg?color=%234b5563`;
}

export function getBlogShareIconUrl(platform: BlogSharePlatform): string | null {
  if (platform.iconSlug) return getSimpleIconUrl(platform.iconSlug);
  if (platform.iconifyIcon) return getIconifyIconUrl(platform.iconifyIcon);
  return null;
}

export const BLOG_SHARE_GROUPS: BlogShareGroup[] = [
  {
    id: "global-mainstream",
    label: { en: "International", zh: "国际主流" },
    platforms: [
      {
        id: "x",
        name: "X",
        region: "global",
        category: "mainstream",
        complianceZone: "global",
        iconSlug: "x",
        fallbackGlyph: "X",
        action: "intent",
        buildIntentUrl: ({ url, title }) =>
          `https://twitter.com/intent/tweet?url=${encode(url)}&text=${encode(title)}`,
      },
      {
        id: "threads",
        name: "Threads",
        region: "global",
        category: "mainstream",
        complianceZone: "global",
        iconSlug: "threads",
        fallbackGlyph: "T",
        action: "intent",
        buildIntentUrl: (payload) =>
          `https://www.threads.net/intent/post?text=${encode(shareText(payload))}`,
      },
      {
        id: "linkedin",
        name: "LinkedIn",
        region: "global",
        category: "mainstream",
        complianceZone: "global",
        iconifyIcon: "simple-icons/linkedin",
        fallbackGlyph: "in",
        action: "intent",
        buildIntentUrl: ({ url }) =>
          `https://www.linkedin.com/sharing/share-offsite/?url=${encode(url)}`,
      },
      {
        id: "facebook",
        name: "Facebook",
        region: "global",
        category: "mainstream",
        complianceZone: "global",
        iconSlug: "facebook",
        fallbackGlyph: "f",
        action: "intent",
        buildIntentUrl: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,
      },
      {
        id: "instagram",
        name: "Instagram",
        region: "global",
        category: "mainstream",
        complianceZone: "global",
        iconSlug: "instagram",
        fallbackGlyph: "IG",
        action: "copy",
      },
      {
        id: "tiktok",
        name: "TikTok",
        region: "global",
        category: "mainstream",
        complianceZone: "global",
        iconSlug: "tiktok",
        fallbackGlyph: "TT",
        action: "copy",
      },
    ],
  },
  {
    id: "global-hacker",
    label: { en: "Hacker / Dev", zh: "国际 Hacker / Dev" },
    platforms: [
      {
        id: "reddit",
        name: "Reddit",
        region: "global",
        category: "hacker",
        complianceZone: "global",
        iconSlug: "reddit",
        fallbackGlyph: "R",
        action: "intent",
        buildIntentUrl: ({ url, title }) =>
          `https://www.reddit.com/submit?url=${encode(url)}&title=${encode(title)}`,
      },
      {
        id: "hacker-news",
        name: "Hacker News",
        region: "global",
        category: "hacker",
        complianceZone: "global",
        iconSlug: "ycombinator",
        fallbackGlyph: "HN",
        action: "intent",
        buildIntentUrl: ({ url, title }) =>
          `https://news.ycombinator.com/submitlink?u=${encode(url)}&t=${encode(title)}`,
      },
      {
        id: "dev",
        name: "DEV",
        region: "global",
        category: "hacker",
        complianceZone: "global",
        iconSlug: "devdotto",
        fallbackGlyph: "DEV",
        action: "copy",
      },
    ],
  },
  {
    id: "cn-mainstream",
    label: { en: "China", zh: "中国主流" },
    platforms: [
      {
        id: "wechat",
        name: "微信",
        region: "mainland-china",
        category: "mainstream",
        complianceZone: "cn",
        iconSlug: "wechat",
        fallbackGlyph: "微",
        action: "copy",
      },
      {
        id: "wechat-moments",
        name: "朋友圈",
        region: "mainland-china",
        category: "mainstream",
        complianceZone: "cn",
        iconSlug: "wechat",
        fallbackGlyph: "朋",
        action: "copy",
      },
      {
        id: "qq",
        name: "QQ",
        region: "mainland-china",
        category: "mainstream",
        complianceZone: "cn",
        iconSlug: "qq",
        fallbackGlyph: "QQ",
        action: "intent",
        buildIntentUrl: ({ url, title, excerpt }) =>
          `https://connect.qq.com/widget/shareqq/index.html?url=${encode(url)}&title=${encode(title)}&summary=${encode(excerpt ?? "")}`,
      },
      {
        id: "zhihu",
        name: "知乎",
        region: "mainland-china",
        category: "mainstream",
        complianceZone: "cn",
        iconSlug: "zhihu",
        fallbackGlyph: "知",
        action: "copy",
      },
      {
        id: "xiaohongshu",
        name: "小红书",
        region: "mainland-china",
        category: "mainstream",
        complianceZone: "cn",
        iconSlug: "xiaohongshu",
        fallbackGlyph: "红",
        action: "copy",
      },
      {
        id: "douyin",
        name: "抖音",
        region: "mainland-china",
        category: "mainstream",
        complianceZone: "cn",
        iconSlug: "tiktok",
        fallbackGlyph: "抖",
        action: "copy",
      },
    ],
  },
  {
    id: "cn-hacker",
    label: { en: "China Hacker / Dev", zh: "中国 Hacker / Dev" },
    platforms: [
      {
        id: "v2ex",
        name: "V2EX",
        region: "mainland-china",
        category: "hacker",
        complianceZone: "cn",
        iconSlug: "v2ex",
        fallbackGlyph: "V2",
        action: "copy",
      },
      {
        id: "linux-do",
        name: "Linux DO",
        region: "mainland-china",
        category: "hacker",
        complianceZone: "cn",
        fallbackGlyph: "LD",
        action: "copy",
      },
    ],
  },
];
