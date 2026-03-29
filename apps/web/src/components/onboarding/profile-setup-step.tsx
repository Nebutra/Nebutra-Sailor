"use client";

import { Button, Input } from "@nebutra/ui/components";
import { Label } from "@nebutra/ui/primitives";
import { Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

interface ProfileSetupStepProps {
  onComplete: () => void;
}

export function ProfileSetupStep({ onComplete }: ProfileSetupStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("logo", file);
      await fetch("/api/onboarding/upload-logo", {
        method: "POST",
        body: formData,
      });
    } catch {
      // Logo upload failed silently — user can retry
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (displayName.trim()) {
        const parts = displayName.trim().split(/\s+/);
        const response = await fetch("/api/onboarding/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: parts[0] ?? "",
            lastName: parts.slice(1).join(" ") || "",
          }),
        });

        if (!response.ok) {
          // Profile update failed, but still continue
        }
      }
      onComplete();
    } catch {
      onComplete();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Personalize your profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add a logo and set your display name.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Org logo upload */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary"
          >
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Logo"
                fill
                className="object-cover"
                unoptimized={logoPreview.startsWith("data:")}
              />
            ) : (
              <Upload className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground">Upload organization logo</p>
        </div>

        {/* Display name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            placeholder="Your full name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <Button htmlType="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Continue →"}
        </Button>

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
