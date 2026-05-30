/**
 * Debounced Refresh Hook
 *
 * Wraps usehooks-ts (already a workspace dependency) so the rest of the
 * monorepo gets a single canonical debounced hook surface:
 * - cancellable
 * - configurable delay
 * - leading / trailing modes
 */

import { useCallback, useEffect, useRef } from "react";
import { useDebounceCallback, useDebounceValue } from "usehooks-ts";

type DebouncedRefreshResult = {
  schedule: () => void;
  cancel: () => void;
  isPending: () => boolean;
  flush: () => void;
};

/**
 * 防抖刷新 Hook
 *
 * 用于限制频繁触发的刷新操作
 *
 * @param callback - 要执行的回调函数
 * @param delay - 延迟时间 (毫秒)
 * @returns 控制对象 { schedule, cancel, isPending, flush }
 *
 * @example
 * const { schedule, cancel } = useDebouncedRefresh(() => {
 *   refetch();
 * }, 400);
 *
 * // 在数据变化时调用
 * useEffect(() => {
 *   schedule();
 * }, [data]);
 */
export function useDebouncedRefresh(callback: () => void, delay = 400): DebouncedRefreshResult {
  const callbackRef = useRef(callback);

  // 保持回调引用最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 使用 usehooks-ts 的 useDebounceCallback
  const debounced = useDebounceCallback(
    () => {
      callbackRef.current();
    },
    delay,
    { leading: false, trailing: true },
  );

  const schedule = useCallback(() => {
    debounced();
  }, [debounced]);

  const cancel = useCallback(() => {
    debounced.cancel();
  }, [debounced]);

  const isPending = useCallback(() => {
    return debounced.isPending();
  }, [debounced]);

  const flush = useCallback(() => {
    debounced.flush();
  }, [debounced]);

  // 组件卸载时取消
  useEffect(() => cancel, [cancel]);

  return { schedule, cancel, isPending, flush };
}

/**
 * 防抖值 Hook
 *
 * Thin wrapper over usehooks-ts useDebounceValue so consumers can import
 * the canonical hook from @nebutra/ui/hooks alongside useDebouncedRefresh.
 *
 * @param value - 要防抖的值
 * @param delay - 延迟时间 (毫秒)
 * @returns 防抖后的值
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState("");
 * const debouncedSearch = useDebouncedValue(searchTerm, 300);
 *
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     performSearch(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 */
export function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debouncedValue] = useDebounceValue(value, delay);
  return debouncedValue;
}
