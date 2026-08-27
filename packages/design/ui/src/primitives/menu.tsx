"use client";

import { ChevronDown, LockClosed } from "@nebutra/icons";
import {
  createContext,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  use,
} from "react";
import { overlayClassNames } from "../tokens/components/overlay";
import { cn } from "../utils/cn";
import { Button, type ButtonProps } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  type DropdownMenuContentProps,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

/* -------------------------------------------------------------------------- *\
 *  Menu family — Geist-flat API on top of DropdownMenu.
 *
 *  Use cases (per Geist guidance):
 *    Discoverable trigger that opens a list of actions on a single resource
 *    (a dots menu on a row, a dropdown on a primary entity). For right-click
 *    or long-press on a row use ContextMenu; for ⌘K global commands use
 *    CommandMenu; for two related primary actions use a split button.
 *
 *  Behavior — inherited from Base UI / DropdownMenu:
 *    Open on click (not hover), Arrow/Home/End/Enter/Space navigation,
 *    typeahead, close on item activation / Escape / outside-click, focus
 *    returns to trigger on close, position auto-flips on window bounds.
 *
 *  Why this lives next to DropdownMenu, not as a fork:
 *    DropdownMenu encodes all the heavy a11y wiring. Menu* is a thin facade
 *    that rewrites Geist's surface (title-cased section headers, lock icon
 *    on permission-gated rows, prefix/suffix slots, error coloring) into
 *    DropdownMenu primitives. Don't duplicate behavior.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Position → side/align mapping
// ---------------------------------------------------------------------------

export type MenuPosition =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end"
  | "right-start"
  | "right-end"
  | "left-start"
  | "left-end";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "end";

function splitPosition(position: MenuPosition): { side: Side; align: Align } {
  const [side, align] = position.split("-") as [Side, Align];
  return { side, align };
}

// ---------------------------------------------------------------------------
// Context — share position from MenuContainer down to Menu
// ---------------------------------------------------------------------------

const MenuContext = createContext<MenuPosition | null>(null);

function useMenuPosition(): MenuPosition {
  return use(MenuContext) ?? "bottom-start";
}

// ---------------------------------------------------------------------------
// MenuContainer
// ---------------------------------------------------------------------------

export interface MenuContainerProps {
  /** Anchor + alignment of the popup. @default "bottom-start" */
  position?: MenuPosition;
  children: ReactNode;
}

export function MenuContainer({ position = "bottom-start", children }: MenuContainerProps) {
  return (
    <MenuContext.Provider value={position}>
      <DropdownMenu>{children}</DropdownMenu>
    </MenuContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// MenuButton
// ---------------------------------------------------------------------------

export interface MenuButtonProps extends Omit<ButtonProps, "variant" | "size" | "shape" | "type"> {
  /** Append a chevron-down glyph after the label. */
  showChevron?: boolean;
  /** Geist Button "type" alias. */
  type?: "primary" | "secondary" | "tertiary" | "ghost" | "warning" | "destructive";
  /** "unstyled" strips chrome so an arbitrary trigger (avatar, dots) takes over. */
  variant?: "unstyled";
  /** Geist sizes. */
  size?: "small" | "medium" | "large" | "tiny";
  shape?: "default" | "square" | "circle";
  /** Trigger contains only an SVG; ensure an aria-label is set. */
  svgOnly?: boolean;
}

const GEIST_TYPE_TO_VARIANT = {
  primary: "default",
  secondary: "secondary",
  tertiary: "tertiary",
  ghost: "ghost",
  warning: "warning",
  destructive: "destructive",
} as const;

const GEIST_SIZE_TO_NEBUTRA = {
  tiny: "tiny",
  small: "sm",
  medium: "default",
  large: "lg",
} as const;

export const MenuButton = function MenuButton({
  showChevron,
  type = "primary",
  variant,
  size = "medium",
  shape = "default",
  svgOnly,
  children,
  className,
  onClick,
  prefix,
  suffix,
  loading,
  "aria-label": ariaLabel,
  ref,
  ...rest
}: MenuButtonProps & { ref?: Ref<HTMLButtonElement> | undefined }) {
  const isUnstyled = variant === "unstyled";

  // For the bare-button path, narrow to just the HTML attributes we know are
  // safe; ButtonProps's polymorphic shape doesn't compose with <button> here.
  const buttonHtmlProps = {
    ...(onClick !== undefined ? { onClick } : {}),
    ...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {}),
  };

  return (
    <DropdownMenuTrigger asChild>
      {isUnstyled ? (
        // "unstyled" — render a bare button so callers can wrap an avatar,
        // dots icon, etc. without inheriting Button chrome.
        <button
          ref={ref}
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-[var(--radius-md)]",
            overlayClassNames.focusRing,
            className,
          )}
          {...buttonHtmlProps}
        >
          {children}
        </button>
      ) : (
        <Button
          ref={ref}
          variant={GEIST_TYPE_TO_VARIANT[type]}
          size={GEIST_SIZE_TO_NEBUTRA[size]}
          shape={shape}
          className={className}
          {...(loading !== undefined ? { loading } : {})}
          {...(prefix !== undefined ? { prefix } : {})}
          {...(suffix !== undefined ? { suffix } : {})}
          {...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {})}
          {...rest}
        >
          {svgOnly ? (
            children
          ) : (
            <>
              {children}
              {showChevron && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
            </>
          )}
        </Button>
      )}
    </DropdownMenuTrigger>
  );
};

// ---------------------------------------------------------------------------
// Menu (the popup)
// ---------------------------------------------------------------------------

export interface MenuProps extends Omit<DropdownMenuContentProps, "side" | "align"> {
  /** Fixed pixel width for the popup; otherwise it sizes to content. */
  width?: number | string;
}

export const Menu = function Menu({
  width,
  style,
  className,
  children,
  ref,
  ...rest
}: MenuProps & { ref?: Ref<HTMLDivElement> | undefined }) {
  const { side, align } = splitPosition(useMenuPosition());
  const widthStyle = width !== undefined ? { width } : {};
  return (
    <DropdownMenuContent
      ref={ref}
      side={side}
      align={align}
      style={{ ...widthStyle, ...style }}
      className={cn("min-w-32", className)}
      {...rest}
    >
      {children}
    </DropdownMenuContent>
  );
};

// ---------------------------------------------------------------------------
// MenuItem
// ---------------------------------------------------------------------------

type MenuItemKind = "default" | "error";

export interface MenuItemProps {
  onClick?: () => void;
  /** Render as an anchor; mutually exclusive with onClick semantically. */
  href?: string;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** `error` renders the row in destructive red — for delete actions. */
  type?: MenuItemKind;
  /**
   * When `href` is present and you need framework-specific routing
   * (next/link, react-router), pass `as={Link}` instead of `<a>`.
   */
  as?: "a" | (() => ReactElement);
  className?: string;
  children: ReactNode;
}

function getTextFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    const parts: string[] = [];
    for (const child of node) {
      const text = getTextFromNode(child);
      if (text) parts.push(text);
    }
    return parts.join(" ");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) return getTextFromNode(node.props.children);
  return "";
}

export const MenuItem = function MenuItem({
  ref,
  onClick,
  href,
  disabled,
  prefix,
  suffix,
  type = "default",
  className,
  children,
}: MenuItemProps & { ref?: Ref<HTMLDivElement> | undefined }) {
  const content = (
    <span className="flex flex-1 items-center gap-2">
      {prefix && (
        <span aria-hidden="true" className="inline-flex shrink-0 [&_svg]:size-4">
          {prefix}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {suffix && (
        <span aria-hidden="true" className="inline-flex shrink-0 [&_svg]:size-4">
          {suffix}
        </span>
      )}
    </span>
  );

  const errorClass =
    type === "error"
      ? "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
      : "";

  // exactOptionalPropertyTypes: only forward props that are defined.
  const passthrough: { onClick?: () => void; disabled?: boolean } = {};
  if (onClick !== undefined) passthrough.onClick = onClick;
  if (disabled !== undefined) passthrough.disabled = disabled;

  if (href !== undefined) {
    const anchorLabel = getTextFromNode(children);

    return (
      <DropdownMenuItem
        ref={ref}
        // Render the item as an anchor so middle-click + right-click both work.
        // Base UI's `render` pattern slots `content` in as the anchor's child
        // at render time, so the `<a>` is not actually empty at runtime.
        // biome-ignore lint/a11y/useAnchorContent: content is injected by Base UI's render-prop pattern at mount time.
        render={<a href={href} aria-label={anchorLabel || undefined} />}
        className={cn(errorClass, className)}
        {...passthrough}
      >
        {content}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem ref={ref} className={cn(errorClass, className)} {...passthrough}>
      {content}
    </DropdownMenuItem>
  );
};

// ---------------------------------------------------------------------------
// MenuLink — shortcut for href-only items
// ---------------------------------------------------------------------------

export interface MenuLinkProps extends Omit<MenuItemProps, "onClick" | "href"> {
  href: string;
}

export const MenuLink = function MenuLink({
  ref,
  ...props
}: MenuLinkProps & { ref?: Ref<HTMLDivElement> | undefined }) {
  return <MenuItem ref={ref} {...props} />;
};

// ---------------------------------------------------------------------------
// MenuItemLocked — permission-gated; visually disabled + lock icon suffix
// ---------------------------------------------------------------------------

export interface MenuItemLockedProps extends Omit<MenuItemProps, "disabled" | "type" | "suffix"> {
  /** Wire an onClick anyway — useful for analytics on attempted activation. */
  onClick?: () => void;
}

export const MenuItemLocked = function MenuItemLocked({
  children,
  ref,
  ...rest
}: MenuItemLockedProps & { ref?: Ref<HTMLDivElement> | undefined }) {
  return (
    <MenuItem ref={ref} disabled suffix={<LockClosed aria-hidden="true" />} {...rest}>
      {children}
    </MenuItem>
  );
};

// ---------------------------------------------------------------------------
// MenuSection — labeled group of items
// ---------------------------------------------------------------------------

export interface MenuSectionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** Title Case, 1–2 words (Workspace, Recent Projects). */
  title?: ReactNode;
  /** Render a divider above the section. @default true after the first */
  showDivider?: boolean;
  children: ReactNode;
}

export const MenuSection = function MenuSection({
  title,
  showDivider,
  children,
  className,
  ref,
  ...rest
}: MenuSectionProps & { ref?: Ref<HTMLDivElement> | undefined }) {
  return (
    <>
      {showDivider && <DropdownMenuSeparator />}
      <DropdownMenuGroup ref={ref} className={className} {...rest}>
        {title && (
          <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wide">
            {title}
          </DropdownMenuLabel>
        )}
        {children}
      </DropdownMenuGroup>
    </>
  );
};
