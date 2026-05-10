import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoYCombinator = forwardRef<SVGSVGElement, IconProps>(
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
      <path fill="#FB651E" d="M16 0H0v16h16z" />
      <path
        fill="#fff"
        d="M7.46 9.047 4.716 3.902H5.97l1.615 3.256q.038.087.087.18.05.093.087.193a.4.4 0 0 1 .037.068l.025.056a4 4 0 0 1 .2.46q.098-.211.217-.454l.242-.503 1.64-3.256h1.168l-2.77 5.207v3.318H7.46z"
      />
    </svg>
  ),
);
LogoYCombinator.displayName = "LogoYCombinator";

export { LogoYCombinator };
export default LogoYCombinator;
