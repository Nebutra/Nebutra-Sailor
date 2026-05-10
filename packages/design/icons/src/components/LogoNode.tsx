import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoNode = forwardRef<SVGSVGElement, IconProps>(
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
      <mask
        id="mask0_872_3158"
        width={14}
        height={16}
        x={1}
        y={0}
        maskUnits="userSpaceOnUse"
        style={{
          maskType: "luminance",
        }}
      >
        <path
          fill="#fff"
          d="m7.623.101-6.246 3.62A.76.76 0 0 0 1 4.377v7.244c0 .27.143.52.377.655L7.624 15.9a.75.75 0 0 0 .754 0l6.245-3.623a.76.76 0 0 0 .377-.655V4.377c0-.27-.144-.52-.378-.656L8.378.1a.76.76 0 0 0-.756 0"
        />
      </mask>
      <g mask="url(#mask0_872_3158)">
        <path
          fill="url(#paint0_linear_872_3158)"
          d="m21.312 3.106-17.6-8.661-9.024 18.483 17.6 8.661z"
        />
      </g>
      <mask
        id="mask1_872_3158"
        width={14}
        height={16}
        x={1}
        y={0}
        maskUnits="userSpaceOnUse"
        style={{
          maskType: "luminance",
        }}
      >
        <path
          fill="#fff"
          d="M1.155 12.08c.06.078.134.146.222.196l5.358 3.108.892.515a.76.76 0 0 0 .583.071l6.588-12.11a.8.8 0 0 0-.176-.14l-4.09-2.37L8.372.1a.8.8 0 0 0-.196-.079z"
        />
      </mask>
      <g mask="url(#mask1_872_3158)">
        <path
          fill="url(#paint1_linear_872_3158)"
          d="M-6.455 5.668 5.972 22.555l16.435-12.191L9.98-6.523z"
        />
      </g>
      <mask
        id="mask2_872_3158"
        width={14}
        height={16}
        x={1}
        y={0}
        maskUnits="userSpaceOnUse"
        style={{
          maskType: "luminance",
        }}
      >
        <path
          fill="#fff"
          d="M7.925.004a.8.8 0 0 0-.302.097l-6.228 3.61 6.716 12.28a.8.8 0 0 0 .268-.092l6.246-3.623a.76.76 0 0 0 .365-.517L8.144.017a.8.8 0 0 0-.215-.013"
        />
      </mask>
      <g mask="url(#mask2_872_3158)">
        <path fill="url(#paint2_linear_872_3158)" d="M1.395.001v15.99h13.592V.002z" />
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_872_3158"
          x1={12.506}
          x2={3.425}
          y1={-1.238}
          y2={17.215}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.3} stopColor="#3E863D" />
          <stop offset={0.5} stopColor="#55934F" />
          <stop offset={0.8} stopColor="#5AAD45" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_872_3158"
          x1={-0.167}
          x2={16.316}
          y1={14.208}
          y2={2.079}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.57} stopColor="#3E863D" />
          <stop offset={0.72} stopColor="#619857" />
          <stop offset={1} stopColor="#76AC64" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_872_3158"
          x1={1.4}
          x2={14.99}
          y1={7.997}
          y2={7.997}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.16} stopColor="#6BBF47" />
          <stop offset={0.38} stopColor="#79B461" />
          <stop offset={0.47} stopColor="#75AC64" />
          <stop offset={0.7} stopColor="#659E5A" />
          <stop offset={0.9} stopColor="#3E863D" />
        </linearGradient>
      </defs>
    </svg>
  ),
);
LogoNode.displayName = "LogoNode";

export { LogoNode };
export default LogoNode;
