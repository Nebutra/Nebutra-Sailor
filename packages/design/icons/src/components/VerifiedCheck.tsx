import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const VerifiedCheck = forwardRef<SVGSVGElement, IconProps>(
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
        fill="transparent"
        stroke="currentColor"
        strokeWidth={1.5}
        d="M2.803 10.153.82 8.171V8.17a.24.24 0 0 1 0-.34l1.983-1.983V3.044q0-.049.017-.093a.24.24 0 0 1 .224-.148h2.804L7.83.82a.24.24 0 0 1 .34 0l1.983 1.983h2.803q.049 0 .093.017a.24.24 0 0 1 .148.224v2.804L15.18 7.83a.24.24 0 0 1 0 .34l-1.983 1.983v2.803a.241.241 0 0 1-.241.241h-2.803L8.171 15.18H8.17a.24.24 0 0 1-.34 0l-1.983-1.983H3.045a.24.24 0 0 1-.242-.242z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="square"
        strokeWidth={1.5}
        d="m5.875 8.531 1.063 1.063 3.187-3.188"
      />
    </svg>
  ),
);
VerifiedCheck.displayName = "VerifiedCheck";

export { VerifiedCheck };
export default VerifiedCheck;
