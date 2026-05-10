import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { AssistedPasswordConfirmation } from "./assisted-password-confirmation";

const meta = {
  title: "Primitives/AssistedPasswordConfirmation",
  component: AssistedPasswordConfirmation,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Visual password confirmation with character-by-character feedback. Green for matching characters, red for mismatches. Shakes when user tries to type beyond the password length.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AssistedPasswordConfirmation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [isValid, setIsValid] = useState(false);
    return (
      <div className="w-80 space-y-4">
        <p className="text-sm text-muted-foreground">
          Password: <code>SecurePass123!</code>
        </p>
        <AssistedPasswordConfirmation password="SecurePass123!" onMatch={() => setIsValid(true)} />
        {isValid && <p className="text-sm text-green-600">✔ Passwords match!</p>}
      </div>
    );
  },
};

export const ShortPassword: Story = {
  render: () => (
    <div className="w-80">
      <AssistedPasswordConfirmation password="abc123" />
    </div>
  ),
};

export const WithCallback: Story = {
  render: () => {
    const [status, setStatus] = useState<"idle" | "typing" | "matched">("idle");
    return (
      <div className="w-80 space-y-4">
        <AssistedPasswordConfirmation
          password="MyPassword"
          onConfirmChange={() => setStatus("typing")}
          onMatch={() => setStatus("matched")}
        />
        <p className="text-sm">
          Status:{" "}
          <span
            className={
              status === "matched"
                ? "text-green-600"
                : status === "typing"
                  ? "text-yellow-600"
                  : "text-muted-foreground"
            }
          >
            {status}
          </span>
        </p>
      </div>
    );
  },
};

export const NoHint: Story = {
  render: () => (
    <div className="w-80">
      <AssistedPasswordConfirmation
        password="SecretPassword"
        showHint={false}
        placeholder="Re-enter password"
      />
    </div>
  ),
};
