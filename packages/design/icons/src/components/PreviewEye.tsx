import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const PreviewEye = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4.022 4.77a5.25 5.25 0 0 1 7.956 0L14.76 8l-1.094 1.27 1.027 1.106 1.625-1.887v-.978l-3.203-3.72C10.422.663 5.578.663 2.885 3.79L-.318 7.51v.978l3.203 3.72a6.75 6.75 0 0 0 7.197 2.02l-1.164-1.254a5.24 5.24 0 0 1-4.896-1.744L1.24 8zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4M4.5 8a3.5 3.5 0 1 1 6.535 1.744l3.015 3.246.51.55-1.1 1.02-.51-.55-2.928-3.153A3.5 3.5 0 0 1 4.5 8"
        clipRule="evenodd"
      />
    </svg>
  ),
);
PreviewEye.displayName = "PreviewEye";

export { PreviewEye };
export default PreviewEye;
