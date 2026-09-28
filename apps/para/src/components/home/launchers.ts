import {
  FileText,
  ImageGeneration,
  PlayCircle,
  Prism,
  Spiral,
  UserScreen,
  Video,
} from "@nebutra/icons";
import type { ComponentType, SVGProps } from "react";
import type { CanvasOptions, CanvasStart } from "@/lib/canvas-start";

/**
 * Home's launchers. LibTV's grid beside 新建画布创作 is split the same way here: the top row is
 * models, the bottom row is tools. The composer's chips are a separate list (TEMPLATE_CHIPS).
 *
 * Every live entry opens a new project's canvas. What the canvas does with it is the query-param
 * contract in `lib/canvas-start.ts`:
 *
 *   万相 Wan      ?template=text-to-video
 *   首帧生视频    ?template=frame-to-video
 *   角色三视图    ?template=character-sheet
 *   故事脚本      ?template=story-script
 *   Qwen 图片     ?seed=image                (composer chip)
 *
 * A `planned` model is drawn in full but cannot be clicked. PARA intends to carry many models;
 * listing the ones that are coming is honest, pretending they work is not. Adding Kling or MiniMax
 * Hailuo is one more entry in MODELS.
 *
 * The art is PARA's own (public/home/*.svg), drawn for these cards; nothing is borrowed.
 */
export interface Launcher {
  id: string;
  name: string;
  /** A short badge beside the name, the way LibTV marks 全新上线 / 独家. */
  tag?: string;
  /** What kind of thing it makes — the grey word on a composer chip. */
  category: string;
  /** One line for the tooltip and screen readers. */
  hint: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  art: string;
  status: "live" | "planned";
  start: CanvasStart;
  opts?: CanvasOptions;
}

export const PLANNED_TAG = "即将上线";

export const MODELS: readonly Launcher[] = [
  {
    id: "wan",
    name: "万相 Wan",
    tag: "全新上线",
    category: "视频",
    hint: "万相视频模型：用一段文字生成视频",
    icon: Video,
    art: "/home/text-to-video.svg",
    status: "live",
    start: "blank",
    opts: { template: "text-to-video" },
  },
  {
    id: "seedance",
    name: "Seedance 2.5",
    tag: PLANNED_TAG,
    category: "视频",
    hint: "Seedance 视频模型，接入中",
    icon: Spiral,
    art: "/home/seedance.svg",
    status: "planned",
    start: "blank",
  },
  {
    id: "veo",
    name: "Google Veo",
    tag: PLANNED_TAG,
    category: "视频",
    hint: "Google Veo 视频模型，接入中",
    icon: Prism,
    art: "/home/veo.svg",
    status: "planned",
    start: "blank",
  },
];

export const TOOLS: readonly Launcher[] = [
  {
    id: "frame-to-video",
    name: "首帧生视频",
    category: "视频",
    hint: "让一张图片动起来",
    icon: PlayCircle,
    art: "/home/frame-to-video.svg",
    status: "live",
    start: "blank",
    opts: { template: "frame-to-video" },
  },
  {
    id: "character-sheet",
    name: "角色三视图",
    tag: "独家",
    category: "角色",
    hint: "为一个角色生成正、侧、背三视图",
    icon: UserScreen,
    art: "/home/character-sheet.svg",
    status: "live",
    start: "blank",
    opts: { template: "character-sheet" },
  },
  {
    id: "story-script",
    name: "故事脚本",
    category: "剧本",
    hint: "把一个想法写成分场脚本",
    icon: FileText,
    art: "/home/story-script.svg",
    status: "live",
    start: "blank",
    opts: { template: "story-script" },
  },
];

const QWEN_IMAGE: Launcher = {
  id: "qwen-image",
  name: "Qwen 图片",
  category: "图片",
  hint: "从提示词生成图片",
  icon: ImageGeneration,
  art: "/home/image.svg",
  status: "live",
  start: "image",
  opts: { seed: "image" },
};

/** The composer's chips: image generation plus every live launcher, models first. */
export const TEMPLATE_CHIPS: readonly Launcher[] = [
  QWEN_IMAGE,
  ...MODELS.filter((m) => m.status === "live"),
  ...TOOLS,
];
