"use client";

/**
 * useOptimisticMutation Hook
 *
 * 乐观更新 hook，用于 tRPC mutation 的乐观更新模式
 * 参考设计规范: docs/design-system/ui-patterns/optimistic-updates.mdx
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";

export type OptimisticStatus = "idle" | "pending" | "success" | "error";

export interface UseOptimisticStateOptions<T> {
  /** 初始数据 */
  initialData: T;
  /** 成功提示 */
  successMessage?: string;
  /** 错误提示 */
  errorMessage?: string;
  /** 成功后回调 */
  onSuccess?: () => void;
  /** 错误后回调 */
  onError?: (error: Error) => void;
}

/**
 * 本地乐观状态管理
 * 用于管理乐观更新的 UI 状态
 */
export function useOptimisticState<T>({
  initialData,
  successMessage,
  errorMessage = "操作失败，已恢复",
  onSuccess,
  onError,
}: UseOptimisticStateOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [previousData, setPreviousData] = useState<T | null>(null);
  const [status, setStatus] = useState<OptimisticStatus>("idle");

  /**
   * 开始乐观更新
   */
  const startOptimistic = useCallback(
    (optimisticData: T) => {
      setPreviousData(data);
      setData(optimisticData);
      setStatus("pending");
    },
    [data],
  );

  /**
   * 确认更新成功
   */
  const confirmSuccess = useCallback(() => {
    setPreviousData(null);
    setStatus("success");
    if (successMessage) {
      toast.success(successMessage);
    }
    onSuccess?.();

    // 重置状态
    setTimeout(() => setStatus("idle"), 1500);
  }, [successMessage, onSuccess]);

  /**
   * 回滚更新
   */
  const rollback = useCallback(
    (error?: Error) => {
      if (previousData !== null) {
        setData(previousData);
        setPreviousData(null);
      }
      setStatus("error");
      toast.error(errorMessage);
      onError?.(error ?? new Error("Unknown error"));

      // 重置状态
      setTimeout(() => setStatus("idle"), 1500);
    },
    [previousData, errorMessage, onError],
  );

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setStatus("idle");
    setPreviousData(null);
  }, []);

  return {
    data,
    setData,
    status,
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
    startOptimistic,
    confirmSuccess,
    rollback,
    reset,
  };
}

/**
 * tRPC Mutation 乐观更新配置生成器
 *
 * @example
 * ```tsx
 * const utils = trpc.useUtils()
 *
 * const toggleTask = trpc.tasks.toggle.useMutation(
 *   createOptimisticConfig({
 *     queryKey: () => utils.tasks.list,
 *     optimisticUpdate: (old, { id, completed }) =>
 *       old?.map((t) => (t.id === id ? { ...t, completed } : t)),
 *     successMessage: "已更新",
 *   })
 * )
 * ```
 */
export function createOptimisticConfig<
  TData,
  TVariables,
  TContext = { previousData: TData | undefined },
>({
  queryKey,
  optimisticUpdate,
  successMessage,
  errorMessage = "操作失败，已恢复",
  onSuccess,
  onError,
}: {
  /** 获取 query utils */
  queryKey: () => {
    cancel: () => Promise<void>;
    getData: () => TData | undefined;
    setData: (updater: undefined | ((old: TData | undefined) => TData | undefined)) => void;
    invalidate: () => Promise<void>;
  };
  /** 乐观更新函数 */
  optimisticUpdate: (old: TData | undefined, variables: TVariables) => TData | undefined;
  /** 成功提示 */
  successMessage?: string;
  /** 错误提示 */
  errorMessage?: string;
  /** 成功回调 */
  onSuccess?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}) {
  return {
    onMutate: async (variables: TVariables): Promise<TContext> => {
      const query = queryKey();
      await query.cancel();
      const previousData = query.getData();

      query.setData((old) => optimisticUpdate(old, variables));

      return { previousData } as TContext;
    },

    onError: (error: Error, _variables: TVariables, context: TContext | undefined) => {
      const query = queryKey();
      if (context && typeof context === "object" && "previousData" in context) {
        query.setData(() => (context as { previousData: TData | undefined }).previousData);
      }
      toast.error(errorMessage);
      onError?.(error);
    },

    onSuccess: () => {
      if (successMessage) {
        toast.success(successMessage);
      }
      onSuccess?.();
    },

    onSettled: async () => {
      const query = queryKey();
      await query.invalidate();
    },
  };
}

/**
 * 删除操作的乐观更新配置
 */
export function createOptimisticDeleteConfig<TData extends { id: string }[]>({
  queryKey,
  successMessage = "已删除",
  errorMessage = "删除失败，已恢复",
  onSuccess,
  onError,
}: {
  queryKey: () => {
    cancel: () => Promise<void>;
    getData: () => TData | undefined;
    setData: (updater: undefined | ((old: TData | undefined) => TData | undefined)) => void;
    invalidate: () => Promise<void>;
  };
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return createOptimisticConfig<TData, { id: string }>({
    queryKey,
    optimisticUpdate: (old, { id }) => old?.filter((item) => item.id !== id) as TData | undefined,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
  });
}
