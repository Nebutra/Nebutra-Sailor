import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const PlayFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14.553 7.776a.25.25 0 0 1 0 .448L1.362 14.819A.25.25 0 0 1 1 14.595V1.406a.25.25 0 0 1 .362-.224z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
PlayFill.displayName = "PlayFill";

export { PlayFill };
export default PlayFill;
