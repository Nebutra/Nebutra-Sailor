import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoGrowthbookMonochrome = forwardRef<SVGSVGElement, IconProps>(
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
        d="m5.826 6.087 8.45-4.754s-.797.7-.762 2.217c.037 1.617.761 2.218.761 2.218l-.993-.452L5.51 8.358s-.188-.529-.192-.927c-.008-.983.508-1.344.508-1.344"
      />
      <path
        fill="currentColor"
        d="m4.029 9.195 9.23-3.377s-.796.7-.76 2.217c.037 1.617.76 2.218.76 2.218l-1.289-.497-8.285 1.631s-.16-.487-.164-.848c-.008-.984.508-1.344.508-1.344"
      />
      <path
        fill="currentColor"
        d="m2.233 11.933 9.74-1.747s-.797.7-.762 2.217c.037 1.617.762 2.218.762 2.218H2.306s-.572-.347-.58-1.394c-.009-.983.507-1.294.507-1.294"
      />
    </svg>
  ),
);
LogoGrowthbookMonochrome.displayName = "LogoGrowthbookMonochrome";

export { LogoGrowthbookMonochrome };
export default LogoGrowthbookMonochrome;
