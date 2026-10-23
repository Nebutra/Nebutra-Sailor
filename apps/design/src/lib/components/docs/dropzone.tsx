"use client";

import { Dropzone } from "@nebutra/ui/primitives";
import * as React from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const MB = 1024 * 1024;

const ACCEPT: Record<string, string | undefined> = {
  any: undefined,
  images: "image/*",
  pdf: ".pdf",
};
const MAX_SIZE: Record<string, { expr: string; bytes: number } | undefined> = {
  none: undefined,
  "1 MB": { expr: "1024 * 1024", bytes: MB },
  "5 MB": { expr: "5 * 1024 * 1024", bytes: 5 * MB },
};
const PROGRESS = ["off", "indeterminate", "40", "100"] as const;

function noop() {}

/** Shows what the zone handed back, so a drop has a visible result. */
function LiveDropzone(props: Omit<React.ComponentProps<typeof Dropzone>, "onFiles" | "onReject">) {
  const [files, setFiles] = React.useState<string[]>([]);
  const [rejected, setRejected] = React.useState<string[]>([]);
  return (
    <div className="flex w-80 max-w-full flex-col gap-2">
      <Dropzone
        {...props}
        onFiles={(accepted) => {
          setFiles(accepted.map((file) => file.name));
          setRejected([]);
        }}
        onReject={(rejections) =>
          setRejected(rejections.map((r) => `${r.file.name} (${r.reason})`))
        }
      />
      {files.length > 0 ? (
        <p className="break-words text-muted-foreground text-xs">Accepted: {files.join(", ")}</p>
      ) : null}
      {rejected.length > 0 ? (
        <p className="break-words text-muted-foreground text-xs">Rejected: {rejected.join(", ")}</p>
      ) : null}
    </div>
  );
}

const KNOBS: Knob[] = [
  { name: "size", type: "select", options: ["sm", "md"], defaultValue: "md" },
  { name: "accept", type: "select", options: Object.keys(ACCEPT), defaultValue: "any" },
  { name: "maxSize", type: "select", options: Object.keys(MAX_SIZE), defaultValue: "none" },
  { name: "multiple", type: "boolean", defaultValue: false },
  {
    name: "maxFiles",
    type: "select",
    options: ["none", "2", "3"],
    defaultValue: "none",
    hint: "Only applies together with multiple.",
  },
  { name: "paste", type: "boolean", defaultValue: false },
  { name: "disabled", type: "boolean", defaultValue: false },
  { name: "label", type: "text", defaultValue: "" },
  { name: "description", type: "text", defaultValue: "PNG or JPG, up to 5 MB" },
  {
    name: "error",
    type: "text",
    defaultValue: "",
    hint: "An external error, such as a failed upload. It replaces validation messages.",
  },
  { name: "progress", type: "select", options: PROGRESS, defaultValue: "off" },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Drop a file, paste one with the paste knob on, or press Enter on the focused zone to open the picker. Accepted and rejected files are listed under the zone."
      code={(v) => {
        const limit = MAX_SIZE[String(v.maxSize)];
        const progress = String(v.progress);
        return snippet({
          imports: [{ names: ["Dropzone"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "Dropzone",
            defaults: { size: "md" },
            props: {
              size: String(v.size),
              accept: ACCEPT[String(v.accept)],
              maxSize: limit ? raw(limit.expr) : undefined,
              multiple: v.multiple,
              maxFiles: v.multiple && v.maxFiles !== "none" ? Number(v.maxFiles) : undefined,
              paste: v.paste,
              disabled: v.disabled,
              label: String(v.label) || undefined,
              description: String(v.description) || undefined,
              error: String(v.error) || undefined,
              progress:
                progress === "off"
                  ? undefined
                  : progress === "indeterminate"
                    ? raw("null")
                    : Number(progress),
              onFiles: raw("(files) => upload(files)"),
            },
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => {
        const limit = MAX_SIZE[String(v.maxSize)];
        const progress = String(v.progress);
        return (
          <LiveDropzone
            disabled={Boolean(v.disabled)}
            multiple={Boolean(v.multiple)}
            paste={Boolean(v.paste)}
            size={v.size as "sm" | "md"}
            {...present({
              accept: ACCEPT[String(v.accept)],
              description: String(v.description) || undefined,
              error: String(v.error) || undefined,
              label: String(v.label) || undefined,
              maxFiles: v.multiple && v.maxFiles !== "none" ? Number(v.maxFiles) : undefined,
              maxSize: limit?.bytes,
              progress:
                progress === "off"
                  ? undefined
                  : progress === "indeterminate"
                    ? null
                    : Number(progress),
            })}
          />
        );
      }}
    />
  );
}

const COLUMNS = [
  { id: "default", label: "Default" },
  { id: "described", label: "Described" },
  { id: "disabled", label: "Disabled" },
  { id: "error", label: "Error" },
  { id: "uploading", label: "Uploading" },
  { id: "indeterminate", label: "Indeterminate" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note="Hover and keyboard focus are live: Tab reaches the hidden file input and the surface draws the ring. Dragging and drag-reject need a real drag, so they are not forced here. Error is the external error prop; validation errors appear after a rejected drop."
      render={(size, column) => (
        <div className="w-72">
          <Dropzone
            disabled={column === "disabled"}
            onFiles={noop}
            size={size as "sm" | "md"}
            {...present({
              description: column === "default" ? undefined : "PNG or JPG, up to 5 MB",
              error: column === "error" ? "Upload failed. Check your connection." : undefined,
              progress: column === "uploading" ? 60 : column === "indeterminate" ? null : undefined,
            })}
          />
        </div>
      )}
      rows={["sm", "md"].map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
