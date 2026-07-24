"use client";

import { Progress } from "@nebutra/ui/primitives";

export function ProgressDemo() {
  return (
    <div className="space-y-8 w-full">
      <div className="space-y-2">
        <div className="text-sm flex justify-between">
          <span>Downloading...</span>
          <span>33%</span>
        </div>
        <Progress value={33} />
      </div>
      <div className="space-y-2">
        <div className="text-sm flex justify-between">
          <span>Processing...</span>
          <span>66%</span>
        </div>
        <Progress value={66} />
      </div>
      <div className="space-y-2">
        <div className="text-sm flex justify-between">
          <span>Completed</span>
          <span>100%</span>
        </div>
        <Progress value={100} />
      </div>
      <div className="space-y-2">
        <div className="text-sm flex justify-between">
          <span>Connecting...</span>
          <span>Indeterminate</span>
        </div>
        <Progress value={undefined} />
      </div>
    </div>
  );
}
