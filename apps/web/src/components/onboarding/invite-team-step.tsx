"use client";

import { Button, Input } from "@nebutra/ui/components";
import { Label } from "@nebutra/ui/primitives";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface InviteTeamStepProps {
  onComplete: () => void;
}

export function InviteTeamStep({ onComplete }: InviteTeamStepProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addField() {
    if (emails.length < 5) {
      setEmails([...emails, ""]);
    }
  }

  function removeField(index: number) {
    setEmails(emails.filter((_, i) => i !== index));
  }

  function updateEmail(index: number, value: string) {
    setEmails(emails.map((e, i) => (i === index ? value : e)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validEmails = emails.filter((email) => email.trim().includes("@"));
    if (validEmails.length === 0) {
      onComplete();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding/invite-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: validEmails }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to send invitations.");
        return;
      }

      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send invitations.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Invite your team</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Collaborate with your team from day one.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Label>Team member emails</Label>
        <div className="space-y-2">
          {emails.map((email, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => updateEmail(i, e.target.value)}
              />
              {emails.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove email"
                  onClick={() => removeField(i)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {emails.length < 5 && (
          <button
            type="button"
            onClick={addField}
            className="flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add another
          </button>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button htmlType="submit" className="flex-1" disabled={loading}>
            {loading ? "Sending invites…" : "Send Invitations →"}
          </Button>
        </div>

        <Button
          htmlType="button"
          variant="text"
          className="w-full text-muted-foreground"
          onClick={onComplete}
        >
          Skip for now
        </Button>
      </form>
    </div>
  );
}
