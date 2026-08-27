import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoVite = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_872_3154)">
        <path
          fill="url(#paint0_linear_872_3154__R_1eimaslubquiuq6ivb_)"
          d="m15.596 2.323-7.18 12.84a.39.39 0 0 1-.68.003L.413 2.324a.39.39 0 0 1 .408-.577l7.188 1.285a.4.4 0 0 0 .138 0l7.038-1.283a.39.39 0 0 1 .41.574"
        />
        <path
          fill="url(#paint1_linear_872_3154__R_1eimaslubquiuq6ivb_)"
          d="M11.433.061 6.119 1.103a.195.195 0 0 0-.157.18l-.327 5.52c-.008.13.112.231.239.202l1.479-.342a.195.195 0 0 1 .235.23l-.44 2.152a.195.195 0 0 0 .248.226l.914-.278a.195.195 0 0 1 .248.226L7.859 12.6c-.043.212.238.327.355.146l.079-.122 4.33-8.64a.195.195 0 0 0-.212-.28l-1.523.294a.195.195 0 0 1-.224-.245l.994-3.446a.195.195 0 0 0-.225-.246"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_872_3154__R_1eimaslubquiuq6ivb_"
          x1={0.234}
          x2={9.171}
          y1={1.288}
          y2={13.424}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#41D1FF" />
          <stop offset={1} stopColor="#BD34FE" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_872_3154__R_1eimaslubquiuq6ivb_"
          x1={7.596}
          x2={9.213}
          y1={0.344}
          y2={11.434}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFEA83" />
          <stop offset={0.083} stopColor="#FFDD35" />
          <stop offset={1} stopColor="#FFA800" />
        </linearGradient>
        <clipPath id="clip0_872_3154">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
LogoVite.displayName = "LogoVite";

export { LogoVite };
export default LogoVite;
