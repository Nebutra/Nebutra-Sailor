/**
 * Debounced Refresh Hook
 *
 * 使用 use-debounce 提供专业的防抖能力:
 * - 可取消
 * - 可配置延迟
 * - 支持 leading/trailing 模式
 */

import { useCallback, useEffect, useRef } from "react";
import { useDebounce, useDebouncedCallback } from "use-debounce";

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

  // 使用 use-debounce 的 useDebouncedCallback
  const debounced = useDebouncedCallback(
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
 * 使用 use-debounce 库提供的专业实现
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
  const [debouncedValue] = useDebounce(value, delay);
  return debouncedValue;
}
