import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const PreviewDocument = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.5 4.674V9.09l1.5 1.616V4.449a1 1 0 0 0-.336-.747l-3.88-3.45A1 1 0 0 0 10.12 0H1v13.5A2.5 2.5 0 0 0 3.5 16h8.228l-.426-.459-.967-1.041H3.5a1 1 0 0 1-1-1v-12h7.43zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4M4.5 8a3.5 3.5 0 1 1 6.535 1.744l3.015 3.246.51.55-1.1 1.02-.51-.55-2.928-3.153A3.5 3.5 0 0 1 4.5 8"
        clipRule="evenodd"
      />
    </svg>
  ),
);
PreviewDocument.displayName = "PreviewDocument";

export { PreviewDocument };
export default PreviewDocument;
