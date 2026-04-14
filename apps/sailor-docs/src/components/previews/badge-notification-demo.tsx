import { Badge } from "@nebutra/ui/primitives";
import { Bell } from "lucide-react";

export function BadgeNotificationDemo() {
  return (
    <div className="relative">
      <Bell className="size-5" />
      <Badge
        variant="destructive"
        className="-top-1 -right-1 size-4 p-0 absolute flex items-center justify-center rounded-full text-[10px]"
      >
        3
      </Badge>
    </div>
  );
}
