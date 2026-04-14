"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";

export function DropdownMenuSubDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">分享设计 (Share Design)</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem>发送电子邮件链接 (Email Link)</DropdownMenuItem>
        <DropdownMenuItem>复制链接 (Copy Link)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>邀请用户 (Invite Users)</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            <DropdownMenuItem>通过电子邮件 (Via Email)</DropdownMenuItem>
            <DropdownMenuItem>从工作区中选择 (From Workspace)</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
          删除 (Delete)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
