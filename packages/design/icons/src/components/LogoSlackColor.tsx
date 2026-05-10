import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoSlackColor = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_872_3152)">
        <path
          fill="#E01E5A"
          d="M3.427 10.079c0 .92-.743 1.663-1.663 1.663S.1 10.998.1 10.079c0-.92.743-1.663 1.663-1.663h1.663zm.831 0c0-.92.744-1.663 1.663-1.663.92 0 1.663.743 1.663 1.663v4.157c0 .92-.743 1.663-1.663 1.663s-1.663-.743-1.663-1.663z"
        />
        <path
          fill="#36C5F0"
          d="M5.921 3.402c-.92 0-1.663-.744-1.663-1.663 0-.92.744-1.663 1.663-1.663.92 0 1.663.743 1.663 1.663v1.663zm0 .844c.92 0 1.663.743 1.663 1.663s-.743 1.663-1.663 1.663h-4.17c-.92 0-1.663-.744-1.663-1.663 0-.92.743-1.663 1.663-1.663z"
        />
        <path
          fill="#2EB67D"
          d="M12.586 5.909c0-.92.743-1.663 1.663-1.663s1.663.743 1.663 1.663-.744 1.663-1.663 1.663h-1.663zm-.832 0c0 .92-.743 1.663-1.663 1.663s-1.663-.744-1.663-1.663v-4.17c0-.92.744-1.663 1.663-1.663.92 0 1.663.743 1.663 1.663z"
        />
        <path
          fill="#ECB22E"
          d="M10.091 12.573c.92 0 1.663.743 1.663 1.663s-.743 1.663-1.663 1.663-1.663-.743-1.663-1.663v-1.663zm0-.831c-.92 0-1.663-.744-1.663-1.663 0-.92.744-1.663 1.663-1.663h4.17c.92 0 1.663.743 1.663 1.663s-.743 1.663-1.663 1.663z"
        />
      </g>
      <defs>
        <clipPath id="clip0_872_3152">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
LogoSlackColor.displayName = "LogoSlackColor";

export { LogoSlackColor };
export default LogoSlackColor;
