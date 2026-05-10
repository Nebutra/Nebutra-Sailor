import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FullscreenClose = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6 1v4a1 1 0 0 1-1 1H1V4.5h3.5V1zm8.25 5H15V4.5h-3.5V1H10v4a1 1 0 0 0 1 1zM10 14.25V15h1.5v-3.5h3.54V10H11a1 1 0 0 0-1 1zM1.75 10H1v1.5h3.5V15H6v-4a1 1 0 0 0-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FullscreenClose.displayName = "FullscreenClose";

export { FullscreenClose };
export default FullscreenClose;
