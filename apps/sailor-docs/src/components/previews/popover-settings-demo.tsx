"use client";

import {
  Button,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Toggle,
} from "@nebutra/ui/primitives";
import { Settings } from "lucide-react";

export function PopoverSettingsDemo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-64">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications">Notifications</Label>
            <Toggle />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="marketing">Marketing emails</Label>
            <Toggle />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
