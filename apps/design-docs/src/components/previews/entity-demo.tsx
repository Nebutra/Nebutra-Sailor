import { ChevronRight, Envelope as Mail, SettingsGear as Settings, User } from "@nebutra/icons";
import { Entity } from "@nebutra/ui/primitives";

export function EntityDemo() {
  return (
    <div className="max-w-md p-8 mx-auto w-full">
      <Entity.List>
        <Entity
          as="li"
          left={
            <div className="rounded-full bg-primary/10 p-2">
              <User className="size-5 text-primary" />
            </div>
          }
          right={<ChevronRight className="size-5 text-muted-foreground" />}
        >
          <Entity.Content title="Profile Settings" description="Update your personal information" />
        </Entity>

        <Entity
          as="li"
          left={
            <div className="rounded-full bg-success/10 p-2">
              <Mail className="size-5 text-success" />
            </div>
          }
          right={<ChevronRight className="size-5 text-muted-foreground" />}
        >
          <Entity.Content title="Email Preferences" description="Manage newsletter subscriptions" />
        </Entity>

        <Entity
          as="li"
          left={
            <div className="rounded-full bg-warning/10 p-2">
              <Settings className="size-5 text-warning" />
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
