import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const MessageTyping = forwardRef<SVGSVGElement, IconProps>(
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
        d="m2.983 10.632-.092-.23-.16-.187C1.942 9.293 1.5 8.182 1.5 7c0-2.856 2.716-5.5 6.5-5.5s6.5 2.644 6.5 5.5-2.716 5.5-6.5 5.5a8 8 0 0 1-1.112-.08l-.663-.097-.515.43a7.2 7.2 0 0 1-2.322 1.297c.068-.337.112-.691.112-1.05 0-.896-.27-1.755-.517-2.368M1 16s.761 0 1.814-.235A9.6 9.6 0 0 0 5 15a8.7 8.7 0 0 0 1.67-1.096q.65.095 1.33.096c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.572.592 3.022 1.591 4.19.216.54.409 1.193.409 1.81 0 .48-.117.983-.27 1.437A8.3 8.3 0 0 1 1 16m3.5-8a1 1 0 1 1 0-2 1 1 0 0 1 0 2M7 7a1 1 0 1 0 2 0 1 1 0 0 0-2 0m4.5 1a1 1 0 1 1 0-2 1 1 0 0 1 0 2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
MessageTyping.displayName = "MessageTyping";

export { MessageTyping };
export default MessageTyping;
