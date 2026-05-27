"use client";

import { User } from "@nebutra/icons";
import { Menu, MenuButton, MenuContainer, MenuItem } from "@nebutra/ui/primitives";

export function Menu5Demo() {
  return (
    <MenuContainer position="bottom-end">
      <MenuButton
        aria-label="Account menu"
        className="bg-muted text-foreground"
        shape="circle"
        size="medium"
        svgOnly
        type="tertiary"
      >
        <User className="size-5" />
      </MenuButton>
      <Menu width={200}>
        <MenuItem>Profile</MenuItem>
        <MenuItem>Preferences</MenuItem>
      </Menu>
    </MenuContainer>
  );
}
