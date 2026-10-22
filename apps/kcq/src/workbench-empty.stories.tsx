import { WorkbenchEmpty } from "./workbench-empty";
export default { title: "Products/KCQ/EmptyChart", component: WorkbenchEmpty };
const base = {
  dataLoading: false,
  shortcutLoading: false,
  dataError: null,
  shortcutError: "",
  chartReady: true,
  hasSelection: false,
  shortcuts: [
    { id: "cn", label: "A 股 · 贵州茅台" },
    { id: "crypto", label: "加密 · BTC / USDT" },
    { id: "us", label: "美股 · Apple" },
  ],
  onSelect: () => {},
  onCancel: () => {},
  onRetry: () => {},
  onHelp: () => {},
};
export const Ready = { args: base };
export const Searching = { args: { ...base, shortcutLoading: true } };
export const Loading = { args: { ...base, hasSelection: true, dataLoading: true } };
export const Unavailable = {
  args: { ...base, hasSelection: true, dataError: "行情服务暂时不可用，请重试。" },
};
