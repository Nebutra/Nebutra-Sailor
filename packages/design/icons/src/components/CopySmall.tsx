import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const CopySmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M12.625 6c.898 0 1.625.728 1.625 1.625v5c0 .898-.727 1.625-1.625 1.625h-4A1.625 1.625 0 0 1 7 12.625v-5C7 6.728 7.728 6 8.625 6zm-4 1.25a.375.375 0 0 0-.375.375v5c0 .207.168.375.375.375h4a.375.375 0 0 0 .375-.375v-5a.375.375 0 0 0-.375-.375zm.065-5.259c.898 0 1.625.728 1.625 1.625v1.09h-1.25v-1.09a.375.375 0 0 0-.375-.375h-4a.375.375 0 0 0-.375.375v6c0 .207.168.375.375.375h1.112v1.25H4.69a1.625 1.625 0 0 1-1.625-1.625v-6c0-.897.728-1.625 1.625-1.625z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
CopySmall.displayName = "CopySmall";

export { CopySmall };
export default CopySmall;
