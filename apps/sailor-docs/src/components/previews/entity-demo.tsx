import { ChevronRight, Envelope as Mail, SettingsGear as Settings, User } from "@nebutra/icons";
import { Entity } from "@nebutra/ui/primitives";

export function EntityDemo() {
  return (
    <div className="max-w-md p-8 mx-auto w-full">
      <Entity.List>
        <Entity
          as="li"
          left={
            <div className="bg-chart-1/15 p-2 rounded-full">
              <User className="text-chart-1 size-5" />
            </div>
          }
          right={<ChevronRight className="size-5 text-muted-foreground" />}
        >
          <Entity.Content title="Profile Settings" description="Update your personal information" />
        </Entity>

        <Entity
          as="li"
          left={
            <div className="bg-chart-2/15 p-2 rounded-full">
              <Mail className="text-chart-2 size-5" />
            </div>
          }
          right={<ChevronRight className="size-5 text-muted-foreground" />}
        >
          <Entity.Content title="Email Preferences" description="Manage newsletter subscriptions" />
        </Entity>

        <Entity
          as="li"
          left={
            <div className="bg-chart-3/15 p-2 rounded-full">
              <Settings className="text-chart-3 size-5" />
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
