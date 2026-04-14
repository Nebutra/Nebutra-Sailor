import {
  BaseBadge,
  BaseButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@nebutra/ui/primitives";

export function BasePopoverDemo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <BaseButton variant="outline">Show Popover</BaseButton>
      </PopoverTrigger>
      <PopoverContent className="max-w-[300px] text-sm space-y-2" side="top">
        {/* Title */}
        <p className="font-medium">Premium Plan</p>

        {/* Description */}
        <p className="text-muted-foreground">
          Advanced analytics provides deeper insights into your data, including trends, predictions,
          and detailed user behavior.
        </p>

        {/* Additional Note */}
        <p className="flex items-center space-x-1">
          <BaseBadge variant="destructive" size="sm">
            Note!
          </BaseBadge>
          <span className="text-xs text-muted-foreground">Plan upgrade is required.</span>
        </p>
      </PopoverContent>
    </Popover>
  );
}
