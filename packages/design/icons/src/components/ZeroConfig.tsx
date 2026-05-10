import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ZeroConfig = forwardRef<SVGSVGElement, IconProps>(
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
        d="m15.53 1.53.53-.53L15-.06l-.53.53-2.079 2.078a7 7 0 0 0-9.843 9.843L.47 14.47l-.53.53L1 16.06l.53-.53 2.079-2.078a7 7 0 0 0 9.843-9.843zm-4.207 2.087a5.5 5.5 0 0 0-7.706 7.706zm-6.646 8.766 7.706-7.706a5.5 5.5 0 0 1-7.706 7.706"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ZeroConfig.displayName = "ZeroConfig";

export { ZeroConfig };
export default ZeroConfig;
