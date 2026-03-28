"use client";

/**
 * Generic Error Boundary Component
 *
 * Reusable error boundary component for catching and displaying errors.
 * Provides:
 * - Error catching and display
 * - Automatic error reporting
 * - Retry functionality
 * - Customizable fallback UI
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import type React from "react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./button";

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom error fallback UI */
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
        <div className="text-center py-4 text-sm text-muted-foreground">
          <span>Failed to load</span>
          {showRetry && (
            <button
              type="button"
              onClick={resetError}
              className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      );

    case "inline":
      return (
        <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="size-3" />
          <span>Error</span>
          {showRetry && (
            <button
              type="button"
              onClick={resetError}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Retry
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
              Retry
            </Button>
          )}
        </div>
      );

    default:
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-muted/50 border border-border rounded-lg">
          <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertCircle className="size-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-1">
            {componentName ? `${componentName} 出错了` : "组件出错了"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            此部分暂时无法加载，请稍后重试
          </p>
          {process.env.NODE_ENV === "development" && (
            <div className="w-full max-w-md p-2 bg-muted rounded mb-4">
              <p className="text-xs font-mono text-muted-foreground break-all">{error.message}</p>
            </div>
          )}
          {showRetry && (
            <Button variant="default" onClick={resetError}>
              <RefreshCw className="size-4 mr-2" />
              Retry
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
  options: Omit<ErrorBoundaryProps, "children"> = {},
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
        <div className="border border-border rounded-lg overflow-hidden">
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
            <div className="p-3 bg-muted text-xs font-mono text-muted-foreground">
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
 * Panel/抽屉组件专用错误边界
 */
export function PanelErrorBoundary({
  children,
  panelName,
}: {
  children: ReactNode;
  panelName?: string;
}): React.ReactElement {
  return (
    <ErrorBoundary componentName={panelName || "Panel"} variant="default">
      {children}
    </ErrorBoundary>
  );
}

/**
 * Card组件专用错误边界
 */
export function CardErrorBoundary({
  children,
  cardName,
}: {
  children: ReactNode;
  cardName?: string;
}): React.ReactElement {
  return (
    <ErrorBoundary componentName={cardName || "Card"} variant="compact">
      {children}
    </ErrorBoundary>
  );
}
