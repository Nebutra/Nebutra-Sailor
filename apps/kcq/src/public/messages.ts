/**
 * Public-page copy. Placeholder skeletons only: page names, head metadata and navigation.
 * Landing content (fork task 10-09-frontend-design-system §6) adds its sections here.
 */
import type { PublicLocale } from "./routes";

const en = {
  nav: { label: "Site", app: "Open workstation", language: "Language" },
  home: {
    title: "KLineChartQuant · K-line charting engine and quant workstation",
    description: "Open-source K-line charting engine and quant workstation.",
    heading: "KLineChartQuant",
  },
  benchmark: {
    title: "KCQ benchmark",
    description: "Public, reproducible rendering benchmark for the KLineChartQuant chart engine.",
    heading: "KCQ benchmark",
    pending: "Methodology and results are in preparation.",
  },
};

export type PublicMessages = typeof en;

const zh: PublicMessages = {
  nav: { label: "站点", app: "打开工作台", language: "语言" },
  home: {
    title: "KLineChartQuant · K 线图表引擎与量化工作台",
    description: "开源 K 线图表引擎与量化工作台。",
    heading: "KLineChartQuant",
  },
  benchmark: {
    title: "KCQ 基准测试",
    description: "KLineChartQuant 图表引擎的公开、可复现渲染基准测试。",
    heading: "KCQ 基准测试",
    pending: "测试方法与结果正在准备中。",
  },
};

export const PUBLIC_MESSAGES: Record<PublicLocale, PublicMessages> = { en, zh };
