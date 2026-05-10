import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Copy = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M2.75.5A1.75 1.75 0 0 0 1 2.25v7.5c0 .966.784 1.75 1.75 1.75H4.5V10H2.75a.25.25 0 0 1-.25-.25v-7.5A.25.25 0 0 1 2.75 2h5.5a.25.25 0 0 1 .25.25V3H10v-.75A1.75 1.75 0 0 0 8.25.5zm5 4A1.75 1.75 0 0 0 6 6.25v7.5c0 .966.784 1.75 1.75 1.75h5.5A1.75 1.75 0 0 0 15 13.75v-7.5a1.75 1.75 0 0 0-1.75-1.75zM7.5 6.25A.25.25 0 0 1 7.75 6h5.5a.25.25 0 0 1 .25.25v7.5a.25.25 0 0 1-.25.25h-5.5a.25.25 0 0 1-.25-.25z"
      clipRule="evenodd"
    />
  </svg>
));
Copy.displayName = "Copy";

export { Copy };
export default Copy;
