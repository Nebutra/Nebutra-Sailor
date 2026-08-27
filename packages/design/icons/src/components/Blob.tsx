import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Blob = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      d="M2.193 12.204c-.266-.444-.443-1.073-.443-1.988 0-1.841.72-3.864 1.898-5.42C4.83 3.234 6.382 2.25 8 2.25s3.17.984 4.352 2.546c1.177 1.556 1.898 3.579 1.898 5.42 0 .915-.178 1.544-.443 1.988-.262.436-.644.752-1.163.984-1.096.49-2.679.562-4.644.562s-3.548-.073-4.644-.562c-.519-.232-.901-.548-1.163-.985m.551 2.353C4.182 15.2 6.1 15.25 8 15.25c1.9 0 3.818-.05 5.256-.693.747-.334 1.39-.837 1.837-1.582.443-.739.657-1.655.657-2.76 0-2.197-.846-4.532-2.202-6.324C12.196 2.104 10.248.75 8 .75S3.804 2.104 2.452 3.891C1.096 5.683.25 8.018.25 10.216c0 1.104.214 2.02.657 2.759.447.745 1.09 1.248 1.837 1.582"
      clipRule="evenodd"
    />
  </svg>
));
Blob.displayName = "Blob";

export { Blob };
export default Blob;
