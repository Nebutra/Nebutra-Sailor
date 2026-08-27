import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Lightning = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.157 0 2.333 9.408l-.56 1.092H7a.25.25 0 0 1 .25.25V16h1.593l4.824-9.408.56-1.092H9a.25.25 0 0 1-.25-.25V0zM7 9H4.227L7.25 3.106V5.25C7.25 6.216 8.034 7 9 7h2.773L8.75 12.894V10.75A1.75 1.75 0 0 0 7 9"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Lightning.displayName = "Lightning";

export { Lightning };
export default Lightning;
