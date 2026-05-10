import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Sun = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M8.75.75V0h-1.5v2.75h1.5v-2m2.432 3.007.53-.53.354-.354.53-.53 1.06 1.06-.53.531-.353.354-.53.53zM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m5.25-4.75H16v1.5h-2.75zm-12.5 0H0v1.5h2.75v-1.5h-2m2.123 4.816-.53.53 1.06 1.06.531-.53.354-.353.53-.53-1.06-1.061-.531.53zm.884-7.248-.53-.53-.354-.354-.53-.53 1.06-1.06.531.53.354.353.53.53zm8.309 8.309.53.53 1.06-1.06-.53-.531-.353-.354-.53-.53-1.061 1.06.53.531zm-3.316.123V16h-1.5v-2.75z"
      clipRule="evenodd"
    />
  </svg>
));
Sun.displayName = "Sun";

export { Sun };
export default Sun;
