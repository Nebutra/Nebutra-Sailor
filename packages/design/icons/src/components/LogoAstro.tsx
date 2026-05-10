import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoAstro = forwardRef<SVGSVGElement, IconProps>(
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
        fill="url(#paint0_linear_1427_1479)"
        d="M5.535 13.441c-.803-.713-1.037-2.21-.703-3.295.58.684 1.383.9 2.215 1.023 1.284.188 2.545.118 3.738-.453.136-.065.262-.152.411-.24.112.316.141.634.102.959-.095.79-.5 1.4-1.142 1.862-.257.185-.53.35-.795.525-.816.536-1.037 1.165-.73 2.08l.03.098a2.183 2.183 0 0 1-1.32-2.002c-.004-.213-.004-.428-.033-.639-.072-.512-.32-.742-.786-.755-.48-.013-.858.274-.958.727q-.013.051-.03.11"
      />
      <path
        fill="currentColor"
        d="M1.5 10.478s2.194-1.05 4.393-1.05l1.659-5.043c.062-.244.243-.41.448-.41s.386.166.448.41l1.659 5.043c2.605 0 4.393 1.05 4.393 1.05L10.767.485C10.66.19 10.479 0 10.236 0H5.765c-.244 0-.417.19-.531.485z"
      />
      <defs>
        <linearGradient
          id="paint0_linear_1427_1479"
          x1={4.685}
          x2={12.35}
          y1={16}
          y2={12.274}
          gradientUnits="userSpaceOnUse"
        >
          <stop
            stopColor="#D83333"
            style={{
              stopColor: "color(display-p3 .8471 .2 .2)",
              stopOpacity: 1,
            }}
          />
          <stop
            offset={1}
            stopColor="#F041FF"
            style={{
              stopColor: "color(display-p3 .9412 .2549 1)",
              stopOpacity: 1,
            }}
          />
        </linearGradient>
      </defs>
    </svg>
  ),
);
LogoAstro.displayName = "LogoAstro";

export { LogoAstro };
export default LogoAstro;
