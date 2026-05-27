"use client";

import { ChevronRight } from "@nebutra/icons";
import { Menu, MenuButton, MenuContainer, MenuItem } from "@nebutra/ui/primitives";

export function Menu4Demo() {
  return (
    <MenuContainer position="bottom-start">
      <MenuButton type="secondary" showChevron>
        External Links
      </MenuButton>
      <Menu width={180}>
        <MenuItem href="https://github.com/nebutra" suffix={<ChevronRight />}>
          GitHub Repo
        </MenuItem>
        <MenuItem href="/en/docs" suffix={<ChevronRight />}>
          Documentation
        </MenuItem>
      </Menu>
    </MenuContainer>
  );
}
