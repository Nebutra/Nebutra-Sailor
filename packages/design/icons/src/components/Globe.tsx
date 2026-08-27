import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Globe = forwardRef<SVGSVGElement, IconProps>(
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
        d="M10.268 14.093a6.52 6.52 0 0 0 3.67-3.446c-.819.147-1.724.264-2.691.345-.213 1.208-.552 2.27-.979 3.101M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.483-1.518a7 7 0 0 1-.966 0l-.01-.01c-.265-.255-.561-.687-.837-1.316a10.3 10.3 0 0 1-.629-2.078 40 40 0 0 0 3.918 0 10.3 10.3 0 0 1-.63 2.078c-.275.63-.57 1.06-.835 1.317zm2.936-4.76a26 26 0 0 0 2.953-.434 6.5 6.5 0 0 0 0-2.576 26 26 0 0 0-2.953-.434 18 18 0 0 1 0 3.444m-1.267-3.538c.064.576.098 1.184.098 1.816q-.001.95-.098 1.816a39 39 0 0 1-4.305 0A17 17 0 0 1 5.75 8q.001-.95.097-1.816a39 39 0 0 1 4.305 0m1.095-1.177c.967.082 1.872.199 2.691.346a6.52 6.52 0 0 0-3.67-3.446c.427.83.766 1.893.979 3.1m-2.764-3.49.01.01c.265.257.561.688.837 1.317.254.582.47 1.285.629 2.078a40 40 0 0 0-3.918 0c.159-.793.375-1.496.63-2.078.275-.63.57-1.06.835-1.317l.01-.01a6.6 6.6 0 0 1 .967 0m-2.751.39a6.52 6.52 0 0 0-3.67 3.446c.819-.147 1.724-.264 2.691-.346.213-1.207.552-2.27.979-3.1m-1.15 4.37c-1.096.102-2.094.25-2.954.435a6.5 6.5 0 0 0 0 2.576c.86.184 1.858.333 2.953.434a18 18 0 0 1 0-3.444m.171 4.716a29 29 0 0 1-2.691-.346 6.52 6.52 0 0 0 3.67 3.446c-.427-.83-.766-1.892-.979-3.1"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Globe.displayName = "Globe";

export { Globe };
export default Globe;
