"use client";

/**
 * Market UI icons — Geist (@nebutra/icons) only.
 * Brand logos stay in brand-marks.tsx (@lobehub/icons).
 *
 * Usage: <MarketIcon name="llm" className="h-4 w-4" />
 */

import {
  BookOpen,
  Box,
  Brain,
  ChartActivity,
  ChartBarMiddle,
  Code,
  CreditCard,
  Crop,
  Display,
  External,
  FileText,
  Globe,
  GridSquare,
  Image,
  ImageGeneration,
  Key,
  Layers,
  Layout,
  ListUnordered,
  MagnifyingGlass,
  Message,
  Microphone,
  MoreHorizontal,
  Robot,
  Servers,
  Sparkles,
  StarFill,
  Video,
  Wrench,
} from "@nebutra/icons";
import type { ComponentType, SVGProps } from "react";

export type MarketIconName =
  | "app-store"
  | "api-store"
  | "client"
  | "github"
  | "models"
  | "llm"
  | "fast"
  | "reasoning"
  | "multimodal"
  | "other-cat"
  | "image-gen"
  | "image-edit"
  | "video"
  | "audio"
  | "data"
  | "rag"
  | "tools"
  | "bots"
  | "productivity"
  | "academic"
  | "code"
  | "data-summary"
  | "app-mgmt"
  | "api-keys"
  | "agent"
  | "external"
  | "wallet"
  | "favorites"
  | "more"
  | "docs"
  | "grid"
  | "list";

type SvgIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

/** Single map — swap icons here, never in layout JSX */
export const MARKET_ICON: Record<MarketIconName, SvgIcon> = {
  "app-store": Box,
  "api-store": Servers,
  client: Display,
  github: External, // brand mark optional elsewhere; keep UI pack pure
  models: Layers,
  llm: Message,
  fast: Sparkles,
  reasoning: Brain,
  multimodal: Image,
  "other-cat": Box,
  "image-gen": ImageGeneration,
  "image-edit": Crop,
  video: Video,
  audio: Microphone,
  data: MagnifyingGlass,
  rag: BookOpen,
  tools: Wrench,
  bots: Robot,
  productivity: ChartActivity,
  academic: FileText,
  code: Code,
  "data-summary": ChartBarMiddle,
  "app-mgmt": Layout,
  "api-keys": Key,
  agent: Robot,
  external: Globe,
  wallet: CreditCard,
  favorites: StarFill,
  more: MoreHorizontal,
  docs: BookOpen,
  grid: GridSquare,
  list: ListUnordered,
};

export function MarketIcon({
  name,
  className = "h-4 w-4",
}: {
  name: MarketIconName;
  className?: string;
}) {
  const Icon = MARKET_ICON[name];
  return <Icon className={className} aria-hidden />;
}
