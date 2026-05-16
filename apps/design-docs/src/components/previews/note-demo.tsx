"use client";

import { Button, Note } from "@nebutra/ui/primitives";

export function NoteDemo() {
  return (
    <div className="grid w-full max-w-2xl gap-3">
      <Note label="Region Change" tone="warning">
        Changing this region restarts all functions.
      </Note>
      <Note action={<Button size="sm">Review Usage</Button>} tone="secondary">
        This workspace is close to its included usage limit.
      </Note>
      <Note fill tone="success">
        Domain ownership was verified.
      </Note>
      <Note action={<Button size="sm">Open Logs</Button>} tone="error">
        Build log streaming failed. Review the latest run before retrying.
      </Note>
      <Note tone="cyan">
        Read the <a href="#usage">usage guide</a> before enabling cross-region replication.
      </Note>
    </div>
  );
}
