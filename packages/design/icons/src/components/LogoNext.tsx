import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoNext = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_53_108)">
        <circle
          cx={8}
          cy={8}
          r={7.375}
          fill="#000"
          stroke="var(--ds-gray-1000)"
          strokeLinecap="round"
        />
        <path
          stroke="url(#paint0_linear_53_108_R_1eik6slubquiuq6ivb_)"
          strokeMiterlimit={Math.SQRT2}
          d="M10.63 11V5"
        />
        <path
          fill="url(#paint1_linear_53_108_R_1eik6slubquiuq6ivb_)"
          fillRule="evenodd"
          d="M5.995 5h-1.25v6h1.25V6.968l6.366 7.74q.527-.344.992-.763z"
        />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_53_108_R_1eik6slubquiuq6ivb_"
          x1={11.13}
          x2={11.13}
          y1={5}
          y2={11}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset={0.609} stopColor="#fff" stopOpacity={0.57} />
          <stop offset={0.797} stopColor="#fff" stopOpacity={0} />
          <stop offset={1} stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <linearGradient
          id="paint1_linear_53_108_R_1eik6slubquiuq6ivb_"
          x1={9.938}
          x2={13.557}
          y1={9.063}
          y2={13.399}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset={1} stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <clipPath id="clip0_53_108">
          <path fill="red" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
LogoNext.displayName = "LogoNext";

export { LogoNext };
export default LogoNext;
