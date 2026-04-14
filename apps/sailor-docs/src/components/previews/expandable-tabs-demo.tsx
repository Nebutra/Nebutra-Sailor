"use client";

import { ExpandableTabs } from "@nebutra/ui/primitives";
import { Bell, Home, Search, User } from "lucide-react";
import { useState } from "react";

export function ExpandableTabsDemo() {
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const tabs = [
    { title: "Home", icon: Home },
    { title: "Search", icon: Search },
    { title: "Notifications", icon: Bell },
    { title: "Profile", icon: User },
  ];

  return (
    <div className="p-8 gap-4 flex w-full flex-col items-center justify-center">
      <ExpandableTabs tabs={tabs} onChange={setActiveTab} />
      <p className="text-sm text-muted-foreground">
        Active tab: <strong>{activeTab !== null ? tabs[activeTab]?.title : "None"}</strong>
      </p>
    </div>
  );
}
