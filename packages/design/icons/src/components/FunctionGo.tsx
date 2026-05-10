import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FunctionGo = forwardRef<SVGSVGElement, IconProps>(
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
        fill="#00ACD7"
        d="M15.722 11.14c-.53.142-.893.248-1.415.389-.126.035-.134.044-.244-.088-.126-.15-.219-.247-.396-.336-.53-.273-1.044-.194-1.524.133-.573.388-.867.961-.859 1.676.008.705.472 1.287 1.137 1.385.573.079 1.053-.133 1.432-.583.075-.097.143-.202.227-.326h-1.625c-.177 0-.22-.115-.16-.265.11-.273.311-.732.43-.961.024-.053.083-.141.21-.141H16c-.017.238-.017.476-.05.714a3.86 3.86 0 0 1-.691 1.73c-.606.837-1.398 1.358-2.4 1.499-.825.114-1.592-.053-2.265-.582-.624-.494-.977-1.147-1.07-1.959-.11-.961.16-1.826.716-2.584.598-.82 1.39-1.341 2.358-1.526.791-.15 1.55-.053 2.231.432.447.309.767.732.977 1.244.05.08.017.123-.084.15"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M0 2.25A2.25 2.25 0 0 1 2.25 0h11.5A2.25 2.25 0 0 1 16 2.25V8h-1.5V2.25a.75.75 0 0 0-.75-.75H2.25a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75H8V16H2.25A2.25 2.25 0 0 1 0 13.75zm6.25 4.246A2.996 2.996 0 0 1 9.246 3.5h.75V5h-.75C8.42 5 7.75 5.67 7.75 6.496V7H9.5v1.5H7.75v1.004A2.996 2.996 0 0 1 4.754 12.5h-.75V11h.75c.826 0 1.496-.67 1.496-1.496V8.5H4.5V7h1.75z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
FunctionGo.displayName = "FunctionGo";

export { FunctionGo };
export default FunctionGo;
