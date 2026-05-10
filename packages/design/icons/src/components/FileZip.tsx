import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FileZip = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.5 6.5v7a1 1 0 0 1-1 1H9v-2H7v-2h2v-2H7v-2H5v2h2v2H5v2h2v2H4.5a1 1 0 0 1-1-1v-12H8v5h5.5M12.879 5 9.5 1.621V5zM8 0h1.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V13.5a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 2 13.5V0h6"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FileZip.displayName = "FileZip";

export { FileZip };
export default FileZip;
