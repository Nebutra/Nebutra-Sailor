import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoEmber = forwardRef<SVGSVGElement, IconProps>(
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
      <path fill="#E04E39" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0" />
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M8.158 3.016c1.031-.02 1.76.26 2.386 1.149C11.911 7.553 7.026 9.302 6.83 9.37l-.006.002s-.148.92 1.253.885c1.724 0 3.537-1.336 4.227-1.901a.41.41 0 0 1 .558.033l.516.536a.41.41 0 0 1 .01.562 8.8 8.8 0 0 1-3.086 2.188s-2.645 1.224-4.428.065C4.811 11.049 4.52 10.22 4.4 9.36c0 0-1.29-.066-2.12-.39-.829-.323.007-1.3.007-1.3s.255-.405.74 0c.485.403 1.391.22 1.391.22.08-.637.215-1.478.61-2.366.83-1.86 2.1-2.489 3.13-2.509m.607 1.864c-.546-.526-2.123.526-2.184 2.932 0 0 .465.141 1.496-.567 1.031-.707 1.234-1.84.688-2.365"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LogoEmber.displayName = "LogoEmber";

export { LogoEmber };
export default LogoEmber;
