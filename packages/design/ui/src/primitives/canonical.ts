/**
 * Canonical primitive entrypoint.
 *
 * `./index` remains the legacy compatibility barrel. New product surfaces should
 * import from this file when they need the governed primitive set and should
 * deliberately opt into `patterns`, `marketing`, or lab components elsewhere.
 */

export {
  Accordion,
  AccordionContent,
  AccordionItem,
  type AccordionSize,
  AccordionTrigger,
} from "./accordion";
export * from "./alert";
export * from "./alert-dialog";
export * from "./animate-in";
export * from "./aspect-ratio";
export {
  Avatar,
  AvatarFallback,
  type AvatarFallbackProps,
  AvatarGroup,
  type AvatarGroupItem,
  type AvatarGroupProps,
  AvatarImage,
  type AvatarProps,
  type AvatarSize,
} from "./avatar";
export { Badge, type BadgeProps, badgeVariants } from "./badge";
export * from "./breadcrumb";
export {
  Button,
  ButtonLink,
  type ButtonLinkProps,
  type ButtonProps,
} from "./button";
export { buttonVariants } from "./button-variants";
export * from "./card";
export {
  Checkbox,
  CheckboxGroup,
  type CheckboxGroupProps,
  type CheckboxProps,
} from "./checkbox-group";
export * from "./code-block";
export * from "./collapse";
export {
  Combobox,
  ComboboxEmpty,
  ComboboxGroupSub,
  ComboboxInput,
  ComboboxList,
  type ComboboxOption,
  ComboboxOptionItem,
  type ComboboxProps,
  ComboboxRoot,
  ComboboxSeparator,
} from "./combobox";
export * from "./command";
export * from "./context-menu";
export * from "./copy-button";
export * from "./description";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
export * from "./drawer";
export * from "./dropdown-menu";
export * from "./empty-state";
export * from "./error-message";
export * from "./field";
export * from "./form";
export * from "./gauge";
export * from "./hover-card";
export { Input, type InputProps } from "./input";
export * from "./input-otp";
export * from "./kbd";
export { Label, type LabelProps, labelVariants } from "./label";
export * from "./layout";
export * from "./loading-dots";
export * from "./menu";
export * from "./menubar";
export * from "./modal";
export * from "./multi-select";
export * from "./navigation-menu";
export { navigationMenuTriggerStyle } from "./navigation-menu-variants";
export * from "./note";
export * from "./pagination";
export * from "./popover";
export * from "./progress";
export * from "./project-banner";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export * from "./resizable";
export * from "./scroller";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";
export { Separator } from "./separator";
export * from "./sheet";
export * from "./show-more";
export * from "./skeleton";
export * from "./slider";
export * from "./spinner";
export * from "./split-button";
export * from "./stack";
export * from "./status-dot";
export { Switch, type SwitchProps } from "./switch";
export * from "./table";
export {
  Tabs,
  TabsContent,
  type TabsContentProps,
  TabsList,
  type TabsListProps,
  type TabsProps,
  TabsTrigger,
  type TabsTriggerProps,
  tabsContentVariants,
  tabsListVariants,
  tabsTriggerVariants,
} from "./tabs";
export * from "./textarea";
export * from "./theme-switcher";
export * from "./theme-toggle";
export * from "./toaster";
export * from "./toggle";
export * from "./toggle-group";
export { toggleGroupItemVariants, toggleGroupVariants } from "./toggle-group-variants";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
export * from "./tree";
