"use client";

import { type ZxcvbnResult, zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";
import { AlertCircle, Check, Shield, ShieldCheck, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// 初始化 zxcvbn 配置
const options = {
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  useLevenshteinDistance: true,
  translations: zxcvbnEnPackage.translations,
};

// 设置全局选项
zxcvbnOptions.setOptions(options);

/**
 * 密码强度等级
 */
type StrengthLevel = 0 | 1 | 2 | 3 | 4;

/**
 * 密码强度配置
 */
const STRENGTH_CONFIG: Record<
  StrengthLevel,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  0: {
    label: "veryWeak",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500",
    icon: <X className="h-3.5 w-3.5" />,
  },
  1: {
    label: "weak",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  2: {
    label: "fair",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500",
    icon: <Shield className="h-3.5 w-3.5" />,
  },
  3: {
    label: "strong",
    color: "text-lime-600 dark:text-lime-400",
    bgColor: "bg-lime-500",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
  4: {
    label: "veryStrong",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
};

/**
 * 密码要求检查项
 */
interface PasswordRequirement {
  id: string;
  label: string;
  check: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    label: "minLength",
    check: (pwd) => pwd.length >= 8,
  },
  {
    id: "lowercase",
    label: "lowercase",
    check: (pwd) => /[a-z]/.test(pwd),
  },
  {
    id: "uppercase",
    label: "uppercase",
    check: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    id: "number",
    label: "number",
    check: (pwd) => /\d/.test(pwd),
  },
  {
    id: "special",
    label: "special",
    check: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  },
];

interface PasswordStrengthIndicatorProps {
  /** 密码值 */
  password: string;
  /** 是否显示要求列表 */
  showRequirements?: boolean;
  /** 是否显示强度条 */
  showBar?: boolean;
  /** 是否显示反馈信息 */
  showFeedback?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 密码强度变化回调 */
  onStrengthChange?: (score: StrengthLevel, isValid: boolean) => void;
}

/**
 * 使用 zxcvbn 检查密码强度
 */
function usePasswordStrength(password: string) {
  const deferredPassword = useDeferredValue(password);
  return useMemo<ZxcvbnResult | null>(() => {
    if (!deferredPassword) return null;
    // 使用同步 API（zxcvbn v3 使用同步调用）
    return zxcvbn(deferredPassword);
  }, [deferredPassword]);
}

/**
 * 密码强度指示器组件
 *
 * 功能：
 * - 实时计算密码强度评分 (0-4)
 * - 显示强度进度条
 * - 显示密码要求检查列表
 * - 显示改进建议
 */
export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  showBar = true,
  showFeedback = true,
  className,
  onStrengthChange,
}: PasswordStrengthIndicatorProps) {
  const { t } = useI18n();
  const result = usePasswordStrength(password);

  // 检查密码要求
  const requirementResults = useMemo(
    () =>
      PASSWORD_REQUIREMENTS.map((req) => ({
        ...req,
        passed: password ? req.check(password) : false,
      })),
    [password],
  );

  // 计算通过的要求数量
  const passedCount = requirementResults.filter((r) => r.passed).length;
  const allPassed = passedCount === PASSWORD_REQUIREMENTS.length;

  // 获取强度等级
  const score = (result?.score ?? 0) as StrengthLevel;
  const config = STRENGTH_CONFIG[score];

  // 通知父组件强度变化
  useEffect(() => {
    if (onStrengthChange && password) {
      onStrengthChange(score, allPassed && score >= 2);
    }
  }, [score, allPassed, password, onStrengthChange]);

  // 如果没有密码，不显示
  if (!password) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 强度条 */}
      {showBar && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={cn("flex items-center", config.color)}>{config.icon}</span>
              <span className={cn("text-xs font-medium", config.color)}>
                {t(`auth.passwordStrength.levels.${config.label}`) || config.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{score}/4</span>
          </div>

          {/* 进度条 */}
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-200",
                  level <= score ? config.bgColor : "bg-slate-200 dark:bg-slate-700",
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* 密码要求列表 */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {requirementResults.map((req) => (
            <div
              key={req.id}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors duration-200",
                req.passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
              )}
            >
              {req.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              <span>{t(`auth.passwordStrength.requirements.${req.label}`) || req.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* 反馈信息 */}
      {showFeedback && result?.feedback?.warning && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{result.feedback.warning}</span>
        </div>
      )}

      {showFeedback && result?.feedback?.suggestions && result.feedback.suggestions.length > 0 && (
        <div className="space-y-1">
          {result.feedback.suggestions.map((suggestion, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="shrink-0">•</span>
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 简化版密码强度指示器
 * 仅显示强度条和标签
 */
export function PasswordStrengthBar({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  return (
    <PasswordStrengthIndicator
      password={password}
      showRequirements={false}
      showFeedback={false}
      showBar={true}
      className={className}
    />
  );
}
