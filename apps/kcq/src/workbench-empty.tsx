/** Empty-chart controls share the same button contract as every account surface. */
import { Button } from "@nebutra/ui/primitives/canonical";
import type { MarketShortcutId } from "./quick-start";

export interface WorkbenchEmptyProps {
  dataLoading: boolean;
  shortcutLoading: boolean;
  dataError: string | null;
  shortcutError: string;
  chartReady: boolean;
  hasSelection: boolean;
  shortcuts: readonly { id: MarketShortcutId; label: string }[];
  onSelect: (id: MarketShortcutId) => void;
  onCancel: () => void;
  onRetry: () => void;
  onHelp: (returnFocus: HTMLElement) => void;
}

export function WorkbenchEmpty(props: WorkbenchEmptyProps) {
  const error = props.dataError || props.shortcutError;
  return (
    <div className="chart-empty">
      <div role="status" aria-live="polite">
        <h1>
          {props.dataLoading
            ? "正在加载行情"
            : props.shortcutLoading
              ? "正在查找商品"
              : error
                ? "行情暂时不可用"
                : "选择商品，开始研究"}
        </h1>
        {error && <p>{error}</p>}
      </div>
      {props.chartReady && !props.hasSelection && !props.dataLoading && !props.shortcutLoading && (
        <fieldset className="chart-empty-actions" aria-label="快捷打开市场">
          {props.shortcuts.map((shortcut) => (
            <Button
              key={shortcut.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => props.onSelect(shortcut.id)}
            >
              {shortcut.label}
            </Button>
          ))}
        </fieldset>
      )}
      <div className="chart-empty-actions">
        {props.shortcutLoading && (
          <Button type="button" variant="outline" size="sm" onClick={props.onCancel}>
            取消搜索
          </Button>
        )}
        {props.dataError && props.hasSelection && !props.dataLoading && (
          <Button type="button" variant="outline" size="sm" onClick={props.onRetry}>
            重新加载行情
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(event) => props.onHelp(event.currentTarget)}
        >
          如何开始研究
        </Button>
      </div>
    </div>
  );
}
