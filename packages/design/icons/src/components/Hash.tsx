import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Hash = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="m7.24 1.869.12-.741L5.877.89l-.119.74L5.22 5H1.75v1.5h3.23L4.42 10H1.75v1.5h2.43l-.42 2.632-.12.74 1.482.237.119-.74L5.7 11.5h3.48l-.42 2.632-.12.74 1.482.237.119-.74.459-2.869h3.55V10h-3.31l.56-3.5h2.75V5h-2.51l.5-3.131.12-.741L10.877.89l-.119.74L10.22 5H6.74zM9.98 6.5H6.5L5.94 10h3.48z"
      clipRule="evenodd"
    />
  </svg>
));
Hash.displayName = "Hash";

export { Hash };
export default Hash;
