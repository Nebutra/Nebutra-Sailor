"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@nebutra/ui/primitives";

export function SelectGroupsDemo() {
  return (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="选择时区 (Select timezone)" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>北美 (North America)</SelectLabel>
          <SelectItem value="est">东部标准时间 (EST)</SelectItem>
          <SelectItem value="cst">中部标准时间 (CST)</SelectItem>
          <SelectItem value="pst">太平洋标准时间 (PST)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>欧洲 (Europe)</SelectLabel>
          <SelectItem value="gmt">格林威治标准时间 (GMT)</SelectItem>
          <SelectItem value="cet">中央欧洲时间 (CET)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
