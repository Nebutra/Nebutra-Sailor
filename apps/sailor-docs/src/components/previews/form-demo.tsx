"use client";

import { Button, Input, Label } from "@nebutra/ui/primitives";
import { useState } from "react";

export function FormDemo() {
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const trimmed = username.trim();
  const error =
    trimmed.length === 0
      ? "Username is required."
      : trimmed.length < 2
        ? "Username must be at least 2 characters."
        : null;

  return (
    <form
      className="max-w-sm space-y-4 p-6 w-full rounded-xl border bg-background text-left shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (error) return;
        setSubmitted(trimmed);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="form-demo-username">Username</Label>
        <Input
          id="form-demo-username"
          placeholder="johndoe"
          value={username}
          aria-invalid={Boolean(error)}
          aria-describedby="form-demo-description form-demo-message"
          onChange={(event) => {
            setUsername(event.target.value);
            if (submitted) setSubmitted(null);
          }}
        />
        <p id="form-demo-description" className="text-sm text-muted-foreground">
          This is your public display name.
        </p>
        <p id="form-demo-message" className="min-h-5 text-sm text-destructive" aria-live="polite">
          {error ?? ""}
        </p>
      </div>
      <div className="gap-3 flex items-center">
        <Button type="submit" disabled={Boolean(error)}>
          Submit
        </Button>
        {submitted ? (
          <span className="text-sm text-muted-foreground">Saved as {submitted}</span>
        ) : null}
      </div>
    </form>
  );
}
