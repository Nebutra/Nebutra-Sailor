"use client";

import { Menu, MenuButton, MenuContainer, MenuItem } from "@nebutra/ui/primitives";

export function Menu3Demo() {
  return (
    <MenuContainer position="bottom-start">
      <MenuButton type="secondary" showChevron>
        Actions
      </MenuButton>
      <Menu width={180}>
        <MenuItem>Duplicate</MenuItem>
        <MenuItem disabled>Rename&hellip;</MenuItem>
        <MenuItem disabled>Delete</MenuItem>
      </Menu>
    </MenuContainer>
  );
}
