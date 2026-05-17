"use client";

import { SettingsGear as Settings } from "@nebutra/icons";
import {
  Button,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Toggle,
} from "@nebutra/ui/primitives";

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
            <Label id="notifications-label">Notifications</Label>
            <Toggle aria-labelledby="notifications-label" />
          </div>
          <div className="flex items-center justify-between">
            <Label id="marketing-emails-label">Marketing Emails</Label>
            <Toggle aria-labelledby="marketing-emails-label" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
