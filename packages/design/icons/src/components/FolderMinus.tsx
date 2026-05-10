import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FolderMinus = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14.5 4v8.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-10H6l1.333 1c.433.325.96.5 1.5.5zM0 1h6.167a1 1 0 0 1 .6.2l1.466 1.1a1 1 0 0 0 .6.2H16v10a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5V1m5.75 7H5v1.5h6V8H5.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FolderMinus.displayName = "FolderMinus";

export { FolderMinus };
export default FolderMinus;
