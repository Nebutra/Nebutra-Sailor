import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionN = forwardRef<SVGSVGElement, IconProps>(
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
        fill="var(--ds-gray-1000)"
        fillRule="evenodd"
        d="M12.25 9.5 16 16H8.5z"
        clipRule="evenodd"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2.25 0A2.25 2.25 0 0 0 0 2.25v11.5A2.25 2.25 0 0 0 2.25 16H6v-1.5H2.25a.75.75 0 0 1-.75-.75V2.25a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 .75.75V9H16V2.25A2.25 2.25 0 0 0 13.75 0zm6.996 5C8.42 5 7.75 5.67 7.75 6.496V7H9.5v1.5H7.75v1.004A2.996 2.996 0 0 1 4.754 12.5h-.75V11h.75c.826 0 1.496-.67 1.496-1.496V8.5H4.5V7h1.75v-.504A2.996 2.996 0 0 1 9.246 3.5h.75V5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FunctionN.displayName = "FunctionN";

export { FunctionN };
export default FunctionN;
