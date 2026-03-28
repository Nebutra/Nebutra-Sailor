"use client";

/**
 * useProductTour Hook
 *
 * 产品导览 hook，用于新手引导
 * 参考设计规范: docs/design-system/ui-patterns/onboarding-tour.mdx
 */

import { type Driver, type DriveStep, driver } from "driver.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import "driver.js/dist/driver.css";

export interface TourStep {
  /** 目标元素选择器 */
  element?: string;
  /** 弹窗配置 */
  popover: {
    /** 标题 */
    title: string;
    /** 描述 */
    description: string;
    /** 弹窗位置 */
    side?: "top" | "right" | "bottom" | "left";
    /** 对齐方式 */
    align?: "start" | "center" | "end";
  };
}

export interface UseProductTourOptions {
  /** 导览 ID，用于存储状态 */
  tourId: string;
  /** 导览步骤 */
  steps: TourStep[];
  /** 完成回调 */
  onComplete?: () => void;
  /** 跳过回调 */
  onSkip?: () => void;
  /** 是否自动开始 */
  autoStart?: boolean;
  /** 是否只显示一次 */
  showOnce?: boolean;
  /** 延迟启动 (ms) */
  startDelay?: number;
}

/**
 * 产品导览 hook
 */
export function useProductTour({
  tourId,
  steps,
  onComplete,
  onSkip,
  autoStart = false,
  showOnce = true,
  startDelay = 500,
}: UseProductTourOptions) {
  const [isActive, setIsActive] = useState(false);
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);
  const storageKey = `tour-${tourId}-completed`;
  const [hasCompleted, setHasCompleted, removeCompleted] = useLocalStorage<boolean>(
    storageKey,
    false,
  );

  // 使用 ref 存储回调和 steps，避免依赖变化导致的重复启动
  const stepsRef = useRef(steps);
  const onCompleteRef = useRef(onComplete);
  const onSkipRef = useRef(onSkip);
  const isActiveRef = useRef(false); // 用于防止重复启动

  // 同步更新 refs
  useEffect(() => {
    stepsRef.current = steps;
    onCompleteRef.current = onComplete;
    onSkipRef.current = onSkip;
  }, [steps, onComplete, onSkip]);

  const markCompleted = useCallback(() => {
    setHasCompleted(true);
  }, [setHasCompleted]);

  const startTour = useCallback(() => {
    // 防止重复启动
    if (isActiveRef.current) return null;
    if (showOnce && hasCompleted) return null;

    const currentSteps = stepsRef.current;

    // 转换步骤格式
    const driverSteps: DriveStep[] = currentSteps.map((step) => ({
      element: step.element,
      popover: {
        title: step.popover.title,
        description: step.popover.description,
        side: step.popover.side,
        align: step.popover.align,
      },
    }));

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: "rgba(0, 0, 0, 0.5)",
      stagePadding: 8,
      popoverClass: "product-tour-popover",
      progressText: "{{current}} / {{total}}",
      nextBtnText: "下一步",
      prevBtnText: "上一步",
      doneBtnText: "完成",
      steps: driverSteps,
      onDestroyStarted: () => {
        const isComplete = driverObj.getActiveIndex() === currentSteps.length - 1;
        markCompleted();
        setIsActive(false);
        isActiveRef.current = false;
        setDriverInstance(null);

        if (isComplete) {
          onCompleteRef.current?.();
        } else {
          onSkipRef.current?.();
        }

        driverObj.destroy();
      },
    });

    setIsActive(true);
    isActiveRef.current = true;
    setDriverInstance(driverObj);
    driverObj.drive();

    return driverObj;
  }, [showOnce, hasCompleted, markCompleted]);

  const stopTour = useCallback(() => {
    if (driverInstance) {
      driverInstance.destroy();
      setIsActive(false);
      isActiveRef.current = false;
      setDriverInstance(null);
    }
  }, [driverInstance]);

  const resetTour = useCallback(() => {
    removeCompleted();
  }, [removeCompleted]);

  // 自动启动 - 只在关键条件变化时执行
  useEffect(() => {
    // 只有在满足自动启动条件且当前没有活动的 tour 时才启动
    if (autoStart && !hasCompleted && !isActiveRef.current) {
      const timer = setTimeout(() => {
        // 再次检查条件，避免竞态
        if (!isActiveRef.current && !hasCompleted) {
          startTour();
        }
      }, startDelay);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasCompleted, startDelay, startTour]);

  return {
    /** 开始导览 */
    startTour,
    /** 停止导览 */
    stopTour,
    /** 重置导览（允许再次显示） */
    resetTour,
    /** 是否正在进行 */
    isActive,
    /** 是否已完成 */
    hasCompleted,
  };
}
