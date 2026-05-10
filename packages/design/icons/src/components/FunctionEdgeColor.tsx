import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionEdgeColor = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      ref={ref}
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M0 2.25A2.25 2.25 0 0 1 2.25 0h11.5A2.25 2.25 0 0 1 16 2.25V8h-1.5V2.25a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75H8V16H2.25A2.25 2.25 0 0 1 0 13.75zM9.246 5C8.42 5 7.75 5.67 7.75 6.496V7H9.5v1.5H7.75v1.004A2.996 2.996 0 0 1 4.754 12.5h-.75V11h.75c.826 0 1.496-.67 1.496-1.496V8.5H4.5V7h1.75v-.504A2.996 2.996 0 0 1 9.246 3.5h.75V5z"
        clipRule="evenodd"
      />
      <path
        fill="var(--ds-purple-700)"
        fillRule="evenodd"
        d="M11.5 11.875c0-.207.168-.375.375-.375H16V10h-4.125a1.875 1.875 0 0 0-1.5 3 1.875 1.875 0 0 0 1.5 3H16v-1.5h-4.125a.375.375 0 0 1 0-.75H15v-1.5h-3.125a.375.375 0 0 1-.375-.375"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FunctionEdgeColor.displayName = "FunctionEdgeColor";

export { FunctionEdgeColor };
export default FunctionEdgeColor;
