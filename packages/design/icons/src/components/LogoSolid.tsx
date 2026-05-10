import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoSolid = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_872_3153)">
        <path
          fill="#76B3E1"
          d="M16 3.678S10.667-.276 6.54.637L6.24.738c-.604.203-1.107.507-1.409.913l-.201.304-1.51 2.636 2.617.507c1.107.71 2.516 1.013 3.824.71l4.629.912z"
        />
        <path
          fill="url(#paint0_linear_872_3153)"
          d="M16 3.678S10.667-.276 6.54.637L6.24.738c-.604.203-1.107.507-1.409.913l-.201.304-1.51 2.636 2.617.507c1.107.71 2.516 1.013 3.824.71l4.629.912z"
          opacity={0.3}
        />
        <path
          fill="#518AC8"
          d="m4.83 3.678-.402.102c-1.71.507-2.214 2.129-1.308 3.548 1.006 1.318 3.12 2.028 4.83 1.52l6.239-2.128S8.855 2.766 4.83 3.678"
        />
        <path
          fill="url(#paint1_linear_872_3153)"
          d="m4.83 3.678-.402.102c-1.71.507-2.214 2.129-1.308 3.548 1.006 1.318 3.12 2.028 4.83 1.52l6.239-2.128S8.855 2.766 4.83 3.678"
          opacity={0.3}
        />
        <path
          fill="url(#paint2_linear_872_3153)"
          d="M13.082 8.24a4.53 4.53 0 0 0-2.185-1.503 4.5 4.5 0 0 0-2.645-.017l-6.24 2.027L0 12.296l11.27 1.926 2.013-3.65c.403-.71.302-1.52-.201-2.332"
        />
        <path
          fill="url(#paint3_linear_872_3153)"
          d="M11.07 11.789a4.53 4.53 0 0 0-2.185-1.504 4.5 4.5 0 0 0-2.646-.017L0 12.296s5.333 4.055 9.46 3.041l.301-.101c1.71-.507 2.315-2.13 1.308-3.447"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_872_3153"
          x1={2.365}
          x2={14.929}
          y1={Math.LOG10E}
          y2={6.494}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.1} stopColor="#76B3E1" />
          <stop offset={0.3} stopColor="#DCF2FD" />
          <stop offset={1} stopColor="#76B3E1" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_872_3153"
          x1={9.238}
          x2={7.014}
          y1={3.435}
          y2={10.786}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#76B3E1" />
          <stop offset={0.5} stopColor="#4377BB" />
          <stop offset={1} stopColor="#1F3B77" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_872_3153"
          x1={1.449}
          x2={14.178}
          y1={6.639}
          y2={15.229}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#315AA9" />
          <stop offset={0.5} stopColor="#518AC8" />
          <stop offset={1} stopColor="#315AA9" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_872_3153"
          x1={7.165}
          x2={1.981}
          y1={7.683}
          y2={26.551}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4377BB" />
          <stop offset={0.5} stopColor="#1A336B" />
          <stop offset={1} stopColor="#1A336B" />
        </linearGradient>
        <clipPath id="clip0_872_3153">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
LogoSolid.displayName = "LogoSolid";

export { LogoSolid };
export default LogoSolid;
