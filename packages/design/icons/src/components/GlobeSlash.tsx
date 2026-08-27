import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const GlobeSlash = forwardRef<SVGSVGElement, IconProps>(
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
        d="m10.482 13.642-.963-.962q-.09.25-.19.476c-.275.63-.57 1.06-.835 1.317l-.01.01a7 7 0 0 1-.967 0l-.01-.01c-.265-.257-.561-.688-.837-1.317a10.3 10.3 0 0 1-.629-2.078q.937.045 1.924.047L6.693 9.854a38 38 0 0 1-.846-.038q-.046-.43-.072-.88L4.503 7.663a19 19 0 0 0 .078 2.06 26 26 0 0 1-2.953-.435 6.5 6.5 0 0 1 0-2.576 23 23 0 0 1 1.64-.284L2.173 5.333l-.111.02.04-.09L.988 4.147a8 8 0 0 0 10.866 10.865l-1.116-1.115a7 7 0 0 1-.469.196q.111-.215.213-.451m4.106 1.985L.373 1.413A.75.75 0 0 1 1.53.47l1.368 1.368a8 8 0 0 1 11.264 11.264l1.368 1.368a.75.75 0 0 1-.942 1.157m-.65-4.98c-.607.11-1.263.202-1.955.275l1.113 1.113c.336-.423.62-.889.842-1.388M7.194 6.133l3.017 3.018a17 17 0 0 0-.059-2.967 39 39 0 0 0-2.958-.05m-3.23-3.229 1.023 1.022a10 10 0 0 1 .745-2.02 6.5 6.5 0 0 0-1.767.998m7.455 6.818a26 26 0 0 0 2.953-.434 6.5 6.5 0 0 0 0-2.576 26 26 0 0 0-2.953-.434 18 18 0 0 1 0 3.444m-.172-4.715c.967.082 1.872.199 2.691.346a6.52 6.52 0 0 0-3.67-3.446c.427.83.766 1.893.979 3.1m-2.764-3.49.01.01c.265.257.561.688.837 1.317.254.582.47 1.285.629 2.078a40 40 0 0 0-3.918 0c.159-.793.375-1.496.63-2.078.275-.63.57-1.06.835-1.317l.01-.01a6.6 6.6 0 0 1 .967 0m-3.73 9.475a29 29 0 0 1-2.691-.345 6.52 6.52 0 0 0 3.67 3.446c-.427-.83-.766-1.892-.979-3.1"
        clipRule="evenodd"
      />
    </svg>
  ),
);
GlobeSlash.displayName = "GlobeSlash";

export { GlobeSlash };
export default GlobeSlash;
