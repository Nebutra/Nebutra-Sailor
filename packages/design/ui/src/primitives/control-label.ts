import { isValidElement, type ReactNode } from "react";

interface ControlLabelOptions {
  children?: ReactNode | undefined;
  fallbackLabel: string;
  label?: string | undefined;
  labelledBy?: string | undefined;
  title?: string | undefined;
}

export function getControlLabelProps({
  children,
  fallbackLabel,
  label,
  labelledBy,
  title,
}: ControlLabelOptions): { "aria-label"?: string } {
  if (
    hasNonEmptyText(label) ||
    hasNonEmptyText(labelledBy) ||
    hasNonEmptyText(title) ||
    hasAccessibleText(children)
  ) {
    return {};
  }

  return { "aria-label": fallbackLabel };
}

function hasNonEmptyText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAccessibleText(node: ReactNode): boolean {
  if (typeof node === "string" || typeof node === "number") {
    return String(node).trim().length > 0;
  }

  if (Array.isArray(node)) {
    return node.some(hasAccessibleText);
  }

  if (isValidElement(node)) {
    const props = node.props as {
      "aria-label"?: string | undefined;
      "aria-labelledby"?: string | undefined;
      children?: ReactNode | undefined;
      title?: string | undefined;
    };

    return (
      hasNonEmptyText(props["aria-label"]) ||
      hasNonEmptyText(props["aria-labelledby"]) ||
      hasNonEmptyText(props.title) ||
      hasAccessibleText(props.children)
    );
  }

  return false;
}
