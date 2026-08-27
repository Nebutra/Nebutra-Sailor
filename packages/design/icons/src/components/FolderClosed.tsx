import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FolderClosed = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14.5 7.5v5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-5zm0-1.5V4H8.833a2.5 2.5 0 0 1-1.5-.5L6 2.5H1.5V6zM0 1h6.167a1 1 0 0 1 .6.2l1.466 1.1a1 1 0 0 0 .6.2H16v10a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 12.5V1"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FolderClosed.displayName = "FolderClosed";

export { FolderClosed };
export default FolderClosed;
