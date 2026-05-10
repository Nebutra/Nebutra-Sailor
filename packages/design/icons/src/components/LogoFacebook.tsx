import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoFacebook = forwardRef<SVGSVGElement, IconProps>(
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
        fill="#0866FF"
        fillRule="evenodd"
        d="M9.003 15.938A8.001 8.001 0 0 0 8 0a8 8 0 0 0-1.75 15.808V10.43H4.5V8h1.75V6.94c0-2.718 1.035-3.976 3.701-3.976.505 0 1.377.099 1.734.198v2.21c-.188-.02-.517-.03-.923-.03C9.454 5.343 9 5.839 9 7.129V8h2.558l-.447 2.43H9.003z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LogoFacebook.displayName = "LogoFacebook";

export { LogoFacebook };
export default LogoFacebook;
