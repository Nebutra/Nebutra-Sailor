"use client";

/**
 * Generic Error Boundary Component
 *
 * 可复用的错误边界组件，用于包裹可能出错的子组件
 * 提供:
 * - 错误捕获和展示
 * - 自动错误上报
 * - 重试功能
 * - 可定制的 fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./button";
import { AlertCircle, RefreshCw } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** 自定义错误 fallback UI */
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  /** 组件名称，用于错误上报 */
  componentName?: string;
  /** 是否显示重试按钮 */
  showRetry?: boolean;
  /** 是否上报错误 */
  reportErrors?: boolean;
  /** 错误发生时的回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 重置时的回调 */
  onReset?: () => void;
  /** 错误边界样式变体 */
  variant?: "default" | "compact" | "minimal" | "inline";
}

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================================================
// Error Boundary Class Component
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps: Partial<ErrorBoundaryProps> = {
    showRetry: true,
    reportErrors: true,
    variant: "default",
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({ errorInfo });

    // Report error via callback
    if (this.props.reportErrors !== false && this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", this.props.componentName || "Unknown", error);
      console.error("Component Stack:", errorInfo.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback({
            error: this.state.error,
            errorInfo: this.state.errorInfo,
            resetError: this.resetError,
          });
        }
        return this.props.fallback;
      }

      // Default fallback based on variant
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          showRetry={this.props.showRetry ?? true}
          variant={this.props.variant ?? "default"}
          componentName={this.props.componentName ?? "Unknown"}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Default Fallback Components
// ============================================================================

interface DefaultErrorFallbackProps extends ErrorFallbackProps {
  showRetry?: boolean;
  variant?: "default" | "compact" | "minimal" | "inline";
  componentName?: string;
}

function DefaultErrorFallback({
  error,
  resetError,
  showRetry = true,
  variant = "default",
  componentName,
}: DefaultErrorFallbackProps): React.ReactElement {
  switch (variant) {
    case "minimal":
      return (
        <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
          <span>加载失败</span>
          {showRetry && (
            <button
              onClick={resetError}
              className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              重试
            </button>
          )}
        </div>
      );

    case "inline":
      return (
        <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="size-3" />
          <span>出错了</span>
          {showRetry && (
            <button
              onClick={resetError}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              重试
            </button>
          )}
        </span>
      );

    case "compact":
      return (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 truncate">
              {componentName ? `${componentName} 加载失败` : "组件加载失败"}
            </p>
            {process.env.NODE_ENV === "development" && (
              <p className="text-xs text-red-600 dark:text-red-400 truncate mt-0.5">
                {error.message}
              </p>
            )}
          </div>
          {showRetry && (
            <Button size="sm" variant="outline" onClick={resetError}>
              <RefreshCw className="size-3 mr-1" />
              重试
            </Button>
          )}
        </div>
      );

    case "default":
    default:
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertCircle className="size-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-1">
            {componentName ? `${componentName} 出错了` : "组件出错了"}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 text-center">
            此部分暂时无法加载，请稍后重试
          </p>
          {process.env.NODE_ENV === "development" && (
            <div className="w-full max-w-md p-2 bg-slate-100 dark:bg-slate-800 rounded mb-4">
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                {error.message}
              </p>
            </div>
          )}
          {showRetry && (
            <Button variant="default" onClick={resetError}>
              <RefreshCw className="size-4 mr-2" />
              重试
            </Button>
          )}
        </div>
      );
  }
}

// ============================================================================
// HOC for wrapping components
// ============================================================================

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, "children"> = {}
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";

  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary componentName={displayName} {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}

// ============================================================================
// Specialized Error Boundaries
// ============================================================================

/**
 * 表格组件专用错误边界
 */
export function TableErrorBoundary({
  children,
  tableName,
}: {
  children: ReactNode;
  tableName?: string;
}): React.ReactElement {
  return (
    <ErrorBoundary
      componentName={tableName || "表格"}
      variant="compact"
      fallback={({ error, resetError }) => (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                {tableName ? `${tableName}加载失败` : "表格加载失败"}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={resetError}>
              <RefreshCw className="size-3 mr-1" />
              重新加载
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400">
              {error.message}
            </div>
          )}
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * 面板/抽屉组件专用错误边界
 */
export function PanelErrorBoundary({
  children,
  panelName,
}: {
  children: ReactNode;
  panelName?: string;
}): React.ReactElement {
  return (
    <ErrorBoundary
      componentName={panelName || "面板"}
      variant="default"
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * 卡片组件专用错误边界
 */
export function CardErrorBoundary({
  children,
  cardName,
}: {
  children: ReactNode;
  cardName?: string;
}): React.ReactElement {
  return (
    <ErrorBoundary
      componentName={cardName || "卡片"}
      variant="compact"
    >
      {children}
    </ErrorBoundary>
  );
}


