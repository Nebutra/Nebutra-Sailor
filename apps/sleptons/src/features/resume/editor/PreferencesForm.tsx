"use client";

import { DEFAULT_RESUME_MARGINS } from "@nebutra/contracts/sleptons";
import { Field, Input, Select, Switch } from "@nebutra/ui/primitives";
import type { Dispatch } from "react";
import type { EditorAction, EditorContent } from "./state";

interface PreferencesFormProps {
  content: EditorContent;
  dispatch: Dispatch<EditorAction>;
}

const SIDES = ["top", "right", "bottom", "left"] as const;

/** Document preferences (spec §3.2 `preferences`). Not a schema section, so not in the registry. */
export function PreferencesForm({ content, dispatch }: PreferencesFormProps) {
  const p = content.preferences ?? {};
  const margins = p.margins ?? DEFAULT_RESUME_MARGINS;
  const set = (key: string, value: unknown) => dispatch({ type: "setPreference", key, value });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Paper" htmlFor="pref-paper">
        <Select
          id="pref-paper"
          name="paper"
          options={[
            { value: "A4", label: "A4" },
            { value: "Letter", label: "Letter" },
          ]}
          value={p.paper ?? "A4"}
          onValueChange={(v) => set("paper", v ?? "A4")}
        />
      </Field>
      <Field label="Length" htmlFor="pref-length">
        <Select
          id="pref-length"
          name="length"
          options={[
            { value: "1page", label: "One page" },
            { value: "2pages", label: "Two pages" },
          ]}
          value={p.length ?? "1page"}
          onValueChange={(v) => set("length", v ?? "1page")}
        />
      </Field>
      <Input
        id="pref-max-bullets"
        label="Bullets per entry"
        type="number"
        inputMode="numeric"
        min={1}
        max={8}
        value={String(p.max_bullets_per_entry ?? 3)}
        description="1–8. Longer entries are trimmed in print and exports."
        onValueChange={(v) => {
          const n = Number(v);
          if (Number.isInteger(n) && n >= 1 && n <= 8) set("max_bullets_per_entry", n);
        }}
      />
      <div className="grid gap-3">
        <Field label="Show link icons" htmlFor="pref-icons">
          <OnOff
            id="pref-icons"
            value={p.show_icons ?? true}
            onChange={(v) => set("show_icons", v)}
          />
        </Field>
        <Field
          label="Show email and phone on the public page"
          htmlFor="pref-contact"
          description="Off by default. Self-exports always include them."
        >
          <OnOff
            id="pref-contact"
            value={p.show_contact_public ?? false}
            onChange={(v) => set("show_contact_public", v)}
          />
        </Field>
      </div>
      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Print margins</legend>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SIDES.map((side) => (
            <Input
              key={side}
              id={`pref-margin-${side}`}
              label={side[0]?.toUpperCase() + side.slice(1)}
              value={margins[side]}
              placeholder="12mm"
              onValueChange={(v) =>
                set("margins", { ...margins, [side]: v || DEFAULT_RESUME_MARGINS[side] })
              }
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Boolean on the design-system segmented Switch (it is value-based, not a checkbox). */
function OnOff({
  id,
  value,
  onChange,
}: {
  id: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Switch
      id={id}
      size="small"
      value={value ? "on" : "off"}
      onValueChange={(v) => onChange(v === "on")}
    >
      <Switch.Control value="on" label="On" />
      <Switch.Control value="off" label="Off" />
    </Switch>
  );
}
