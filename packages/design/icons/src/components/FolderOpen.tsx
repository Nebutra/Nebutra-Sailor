import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FolderOpen = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.5 4v2h-11V2.5H6l1.333 1c.433.325.96.5 1.5.5zM1 6V1h5.167a1 1 0 0 1 .6.2l1.466 1.1a1 1 0 0 0 .6.2H15V6h1l-.167 1.5-.586 5.276A2.5 2.5 0 0 1 12.762 15H3.238a2.5 2.5 0 0 1-2.485-2.224L.167 7.5 0 6zm13 1.5H1.676l.568 5.11a1 1 0 0 0 .994.89h9.524a1 1 0 0 0 .994-.89l.568-5.11z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FolderOpen.displayName = "FolderOpen";

export { FolderOpen };
export default FolderOpen;
