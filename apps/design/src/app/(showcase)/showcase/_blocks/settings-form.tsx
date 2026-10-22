"use client";

import { SettingsSection, SettingsSectionFooter } from "@nebutra/ui/layout";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@nebutra/ui/primitives";
import { useState } from "react";

const SAVED = "Acme Robotics";

/** One section per setting, each with its own Save: the button is off until the value is both changed and valid. */
export function SettingsForm() {
  const [name, setName] = useState(SAVED);
  const [saved, setSaved] = useState(SAVED);
  const [alerts, setAlerts] = useState(true);

  const trimmed = name.trim();
  const error = trimmed.length < 3 ? "Use at least 3 characters." : undefined;
  const dirty = trimmed !== saved;

  return (
    <div className="w-full">
      <SettingsSection
        description="Shown on invoices, invites and the sidebar."
        title="Workspace name"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (error || !dirty) return;
            setSaved(trimmed);
            toast.success("Workspace name saved");
          }}
        >
          <Field htmlFor="workspace-name" label="Name" {...(error ? { error } : {})}>
            <Input
              aria-invalid={error ? true : undefined}
              id="workspace-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </Field>
          <SettingsSectionFooter hint="Up to 48 characters.">
            <Button disabled={!dirty || Boolean(error)} size="sm" type="submit">
              Save
            </Button>
          </SettingsSectionFooter>
        </form>
      </SettingsSection>

      <SettingsSection
        description="New projects deploy here unless they say otherwise."
        title="Default region"
      >
        <Select defaultValue="sin">
          <SelectTrigger aria-label="Default region" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sin">Singapore (sin1)</SelectItem>
            <SelectItem value="fra">Frankfurt (fra1)</SelectItem>
            <SelectItem value="iad">Washington, D.C. (iad1)</SelectItem>
          </SelectContent>
        </Select>
        <div className="pt-4">
          <Checkbox checked={alerts} onCheckedChange={setAlerts}>
            Email me when a production deploy fails
          </Checkbox>
        </div>
      </SettingsSection>

      <SettingsSection
        description="Removes every project, key and member. This cannot be undone."
        title="Delete workspace"
        tone="danger"
      >
        <SettingsSectionFooter hint="Owners only.">
          <Button size="sm" variant="destructive">
            Delete workspace
          </Button>
        </SettingsSectionFooter>
      </SettingsSection>
    </div>
  );
}
