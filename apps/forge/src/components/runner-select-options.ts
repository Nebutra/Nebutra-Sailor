import { Children, isValidElement, type ReactNode } from "react";

export type RunnerSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return textOf(props.children);
  }
  return "";
}

/** Collect <option> children into { value, label } for the compound Select. */
export function optionsFromChildren(children: ReactNode): RunnerSelectOption[] {
  const options: RunnerSelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== "option") return;
    const props = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    };
    const value = String(props.value ?? "");
    const label = textOf(props.children) || value;
    options.push(props.disabled === true ? { value, label, disabled: true } : { value, label });
  });
  return options;
}
