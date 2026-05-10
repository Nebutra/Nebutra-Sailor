import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoOptimizely = forwardRef<SVGSVGElement, IconProps>(
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
        fill="#3BE081"
        d="M5.54 8.651v1.592c1.212 0 2.37-.47 3.238-1.302a4.31 4.31 0 0 0 1.338-3.13H8.47c0 .76-.307 1.484-.868 2.008-.524.525-1.284.832-2.062.832"
      />
      <path
        fill="#0037FF"
        d="M5.54 13.029c-.778 0-1.52-.29-2.062-.832a2.78 2.78 0 0 1-.85-1.99c0-.742.307-1.465.85-1.99a2.98 2.98 0 0 1 2.062-.832V5.812a4.7 4.7 0 0 0-1.736.325 4.6 4.6 0 0 0-1.484.959c-.434.416-.76.886-.994 1.429a4.2 4.2 0 0 0-.344 1.682c0 .579.108 1.157.344 1.682.235.543.56 1.013.976 1.429s.923.742 1.465.959c.543.217 1.14.343 1.737.343h.018V13.03z"
      />
      <path
        fill="#0CF"
        d="M5.54 13.028v1.574c1.212 0 2.351-.47 3.202-1.284a4.34 4.34 0 0 0 1.338-3.111H8.452a2.78 2.78 0 0 1-.85 1.99 2.98 2.98 0 0 1-2.062.831"
      />
      <path
        fill="#861DFF"
        d="M5.54 4.22v1.573c1.212 0 2.351-.47 3.202-1.284.85-.832 1.338-1.953 1.338-3.111H8.452a2.78 2.78 0 0 1-.85 1.99 2.9 2.9 0 0 1-2.062.832"
      />
      <path
        fill="#FF8110"
        d="M10.46 4.455v1.573c1.212 0 2.351-.47 3.201-1.284C14.512 3.912 15 2.79 15 1.633h-1.628a2.78 2.78 0 0 1-.85 1.99 3 3 0 0 1-2.062.832"
      />
    </svg>
  ),
);
LogoOptimizely.displayName = "LogoOptimizely";

export { LogoOptimizely };
export default LogoOptimizely;
