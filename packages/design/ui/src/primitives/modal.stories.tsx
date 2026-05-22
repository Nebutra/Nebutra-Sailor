"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Modal } from "./modal";

const meta = {
  title: "Primitives/Modal",
  component: Modal.Modal,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Geist-flat compound modal API for blocking decisions, backed by Dialog focus management.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Modal.Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

function ModalFixture({ sticky = false }: { sticky?: boolean }) {
  const [active, setActive] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button onClick={() => setActive(true)}>Open Modal</Button>
      <Modal.Modal
        active={active}
        onClickOutside={() => setActive(false)}
        initialFocusRef={cancelRef}
        sticky={sticky}
      >
        <Modal.Body>
          <Modal.Header>
            <Modal.Title>Create Project</Modal.Title>
            <Modal.Subtitle>
              Choose a readable project name before provisioning begins.
            </Modal.Subtitle>
          </Modal.Header>
          <Modal.Inset>
            <label className="grid gap-2 text-sm" htmlFor="storybook-project-name">
              Project name
              <Input id="storybook-project-name" defaultValue="nebutra-production" />
            </label>
          </Modal.Inset>
        </Modal.Body>
        <Modal.Actions>
          <Modal.Action ref={cancelRef} type="secondary" onClick={() => setActive(false)}>
            Cancel
          </Modal.Action>
          <Modal.Action onClick={() => setActive(false)}>Create</Modal.Action>
        </Modal.Actions>
      </Modal.Modal>
    </>
  );
}

export const Default: Story = {
  render: () => <ModalFixture />,
};

export const Sticky: Story = {
  render: () => <ModalFixture sticky />,
};
