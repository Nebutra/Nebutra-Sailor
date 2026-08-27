import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoGitlabMonochrome = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_3908_2369)">
        <path
          fill="currentColor"
          d="m15.527 6.687-.022-.056-2.12-5.532a.55.55 0 0 0-.547-.347.57.57 0 0 0-.32.119.57.57 0 0 0-.187.285L10.9 5.536H5.104l-1.43-4.38a.556.556 0 0 0-1.056-.058L.494 6.628l-.02.055a3.936 3.936 0 0 0 1.305 4.55l.007.005.02.014 3.229 2.418 1.597 1.209.973.735a.654.654 0 0 0 .791 0l.974-.735 1.597-1.21 3.248-2.432.008-.006a3.94 3.94 0 0 0 1.304-4.544"
          style={{
            fill: "currentColor",
            fillOpacity: 1,
          }}
        />
      </g>
    </svg>
  ),
);
LogoGitlabMonochrome.displayName = "LogoGitlabMonochrome";

export { LogoGitlabMonochrome };
export default LogoGitlabMonochrome;
