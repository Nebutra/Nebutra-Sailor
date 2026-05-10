import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const PictureInPicture = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6.75 13.5H1.5v-11h13v5H16V2a1 1 0 0 0-1-1H1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6.5v-1.5zm3.75-3h4v3h-4zM9 9h7v6H9V9"
        clipRule="evenodd"
      />
    </svg>
  ),
);
PictureInPicture.displayName = "PictureInPicture";

export { PictureInPicture };
export default PictureInPicture;
