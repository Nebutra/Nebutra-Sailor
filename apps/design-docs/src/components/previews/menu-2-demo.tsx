"use client";

import {
  Menu,
  MenuButton,
  MenuContainer,
  MenuItem,
  MenuItemLocked,
  MenuSection,
} from "@nebutra/ui/primitives";

export function Menu2Demo() {
  return (
    <MenuContainer position="bottom-start">
      <MenuButton type="secondary" showChevron>
        Workspace
      </MenuButton>
      <Menu width={220}>
        <MenuSection showDivider={false}>
          <MenuItem>General</MenuItem>
          <MenuItem>Members</MenuItem>
        </MenuSection>
        <MenuSection title="Admin Settings">
          <MenuItemLocked>Billing &amp; Plans</MenuItemLocked>
          <MenuItemLocked>Security Logs</MenuItemLocked>
        </MenuSection>
      </Menu>
    </MenuContainer>
  );
}
