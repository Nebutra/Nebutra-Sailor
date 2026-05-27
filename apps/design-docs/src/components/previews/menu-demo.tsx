"use client";

import { Command, Logout as LogOut, SettingsGear as Settings, User } from "@nebutra/icons";
import { Menu, MenuButton, MenuContainer, MenuItem, MenuSection } from "@nebutra/ui/primitives";

export function MenuDemo() {
  return (
    <MenuContainer position="bottom-start">
      <MenuButton type="secondary" showChevron>
        Account
      </MenuButton>
      <Menu width={220}>
        <MenuSection title="My Account" showDivider={false}>
          <MenuItem prefix={<User />}>Profile</MenuItem>
          <MenuItem
            prefix={<Settings />}
            suffix={<span className="text-xs text-muted-foreground">⌘S</span>}
          >
            Settings
          </MenuItem>
          <MenuItem prefix={<Command />}>Keyboard shortcuts</MenuItem>
        </MenuSection>
        <MenuSection>
          <MenuItem type="error" prefix={<LogOut />}>
            Log out
          </MenuItem>
        </MenuSection>
      </Menu>
    </MenuContainer>
  );
}
