"use client";

import { Button, Input, Modal } from "@nebutra/ui/primitives";
import { useRef, useState } from "react";

export function ModalDemo() {
  const [active, setActive] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex min-h-64 items-center justify-center">
      <Button onClick={() => setActive(true)}>Open Modal</Button>
      <Modal.Modal
        active={active}
        onClickOutside={() => setActive(false)}
        initialFocusRef={cancelRef}
      >
        <Modal.Body>
          <Modal.Header>
            <Modal.Title>Create Project</Modal.Title>
            <Modal.Subtitle>
              Choose a readable project name before provisioning begins.
            </Modal.Subtitle>
          </Modal.Header>
          <Modal.Inset>
            <label className="grid gap-2 text-sm">
              Project name
              <Input defaultValue="nebutra-production" />
            </label>
          </Modal.Inset>
        </Modal.Body>
        <Modal.Actions>
          <Modal.Action ref={cancelRef} type="secondary" onClick={() => setActive(false)}>
            Cancel
          </Modal.Action>
          <Modal.Action type="primary" onClick={() => setActive(false)}>
            Create
          </Modal.Action>
        </Modal.Actions>
      </Modal.Modal>
    </div>
  );
}
