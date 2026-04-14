import { Entity } from "@nebutra/ui/primitives";
import { ChevronRight, Mail, Settings, User } from "lucide-react";

export function EntityDemo() {
  return (
    <div className="max-w-md p-8 mx-auto w-full">
      <Entity.List>
        <Entity
          as="li"
          left={
            <div className="bg-blue-100 p-2 rounded-full dark:bg-blue-900">
              <User className="text-blue-600 dark:text-blue-300 size-5" />
            </div>
          }
          right={<ChevronRight className="size-5 text-muted-foreground" />}
        >
          <Entity.Content title="Profile Settings" description="Update your personal information" />
        </Entity>

        <Entity
          as="li"
          left={
            <div className="bg-emerald-100 dark:bg-emerald-900 p-2 rounded-full">
              <Mail className="text-emerald-600 dark:text-emerald-300 size-5" />
            </div>
          }
          right={<ChevronRight className="size-5 text-muted-foreground" />}
        >
          <Entity.Content title="Email Preferences" description="Manage newsletter subscriptions" />
        </Entity>

        <Entity
          as="li"
          left={
            <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full">
              <Settings className="text-orange-600 dark:text-orange-300 size-5" />
            </div>
          }
          right={<ChevronRight className="size-5 text-muted-foreground" />}
        >
          <Entity.Content
            title="System Configuration"
            description="Advanced administration options"
          />
        </Entity>
      </Entity.List>
    </div>
  );
}
