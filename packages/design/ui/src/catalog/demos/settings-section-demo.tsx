"use client";

import { SettingsSection, SettingsSectionFooter } from "@nebutra/ui/layout";
import { Button, Input } from "@nebutra/ui/primitives";

export function SettingsSectionDemo() {
  return (
    <div className="w-full max-w-3xl p-6">
      <SettingsSection
        title="Organization name"
        description="Shown on invoices, invites and the sidebar."
      >
        <Input defaultValue="Acme" aria-label="Organization name" />
        <SettingsSectionFooter hint="Up to 48 characters.">
          <Button size="sm">Save</Button>
        </SettingsSectionFooter>
      </SettingsSection>
      <SettingsSection
        tone="danger"
        title="Delete organization"
        description="Removes every project, key and member. This cannot be undone."
      >
        <SettingsSectionFooter hint="Owners only.">
          <Button size="sm" variant="destructive">
            Delete organization
          </Button>
        </SettingsSectionFooter>
      </SettingsSection>
    </div>
  );
}
