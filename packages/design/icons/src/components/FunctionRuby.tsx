import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionRuby = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 2.25A2.25 2.25 0 0 1 2.25 0h11.5A2.25 2.25 0 0 1 16 2.25V8h-1.5V2.25a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75H8V16H2.25A2.25 2.25 0 0 1 0 13.75zm6.25 4.246A2.996 2.996 0 0 1 9.246 3.5h.75V5h-.75C8.42 5 7.75 5.67 7.75 6.496V7H9.5v1.5H7.75v1.004A2.996 2.996 0 0 1 4.754 12.5h-.75V11h.75c.826 0 1.496-.67 1.496-1.496V8.5H4.5V7h1.75z"
        clipRule="evenodd"
      />
      <path
        fill="#CA2A30"
        d="m15.725 11.386-1.177-1.338h-4.096l-1.177 1.338a1 1 0 0 0 .05 1.374l3.175 3.117 3.175-3.117a1 1 0 0 0 .05-1.374"
      />
      <path
        fill="#F87274"
        fillRule="evenodd"
        d="M12.466 9.488c1.203.005 2.334.428 2.331 1.029-.003.6-1.052 1.016-2.255 1.012s-2.344-.4-2.34-1c.002-.6 1.062-1.045 2.264-1.04"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FunctionRuby.displayName = "FunctionRuby";

export { FunctionRuby };
export default FunctionRuby;
