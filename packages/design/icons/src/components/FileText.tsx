import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FileText = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14.5 13.5V5.414a1 1 0 0 0-.293-.707L9.793.293A1 1 0 0 0 9.086 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.121L12.379 5zM5.13 5h-.625v1.25h2.12V5H5.13m-.625 3h7.12v1.25h-7.12zm.625 3h-.625v1.25h7.12V11H5.13"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FileText.displayName = "FileText";

export { FileText };
export default FileText;
