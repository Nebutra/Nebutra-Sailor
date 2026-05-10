import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const EyeDashed = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6.514 3.158a5.3 5.3 0 0 1 2.972 0l.422-1.44a6.8 6.8 0 0 0-3.816 0zm4.334.624c.41.265.791.594 1.13.987l1.068 1.24 1.137-.978-1.068-1.24a6.8 6.8 0 0 0-1.452-1.269zm-6.826.987c.339-.393.72-.722 1.13-.987l-.815-1.26a6.8 6.8 0 0 0-1.452 1.269L1.817 5.03l1.137.978zm10.092 2.48L14.76 8l-.646.75 1.136.98 1.068-1.24v-.98L15.25 6.27zm-12.228 0L1.24 8l.646.75-1.137.98-1.067-1.24v-.98L.749 6.27zm11.16 2.742-1.068 1.24c-.339.393-.72.722-1.13.987l.815 1.26a6.8 6.8 0 0 0 1.452-1.269l1.068-1.24zm-9.024 1.24L2.954 9.99l-1.137.978 1.068 1.24a6.8 6.8 0 0 0 1.452 1.269l.815-1.26a5.3 5.3 0 0 1-1.13-.987m5.886 3.05-.422-1.439a5.3 5.3 0 0 1-2.972 0l-.422 1.44a6.8 6.8 0 0 0 3.816 0M6.5 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6"
        clipRule="evenodd"
      />
    </svg>
  ),
);
EyeDashed.displayName = "EyeDashed";

export { EyeDashed };
export default EyeDashed;
