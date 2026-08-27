import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ImageGeneration = forwardRef<SVGSVGElement, IconProps>(
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
        d="M10.571 1.06a3 3 0 1 1 4.243 4.244l-7.335 7.332A3.75 3.75 0 0 1 3.75 16H0v-3.75a3.75 3.75 0 0 1 3.068-3.687zm3.679 10.69a1 1 0 0 0 1 1H16v1.5h-.75a1 1 0 0 0-1 1V16h-1.5v-.75a1 1 0 0 0-1-1H11v-1.5h.75a1 1 0 0 0 1-1V11h1.5zM3.293 10.046A2.25 2.25 0 0 0 1.5 12.25v2.25h2.25a2.25 2.25 0 0 0 2.203-1.794zm1.268-.854 2.12 2.121 1.286-1.286-2.121-2.12zm9.192-7.07a1.5 1.5 0 0 0-2.121 0L6.906 6.845l2.121 2.12 4.726-4.724a1.5 1.5 0 0 0 0-2.12M3.25 0v.75a1 1 0 0 0 1 1H5v1.5h-.75a1 1 0 0 0-1 1V5h-1.5v-.75a1 1 0 0 0-1-1H0v-1.5h.75a1 1 0 0 0 1-1V0z"
      />
    </svg>
  ),
);
ImageGeneration.displayName = "ImageGeneration";

export { ImageGeneration };
export default ImageGeneration;
