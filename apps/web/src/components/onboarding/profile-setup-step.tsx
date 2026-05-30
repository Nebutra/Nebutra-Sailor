"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload as Upload } from "@nebutra/icons";
import { Button, Input } from "@nebutra/ui/components";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@nebutra/ui/primitives";
import Image from "next/image";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface ProfileSetupStepProps {
  onComplete: () => void;
}

const profileSchema = z.object({
  displayName: z.string(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileSetupStep({ onComplete }: ProfileSetupStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "" },
  });

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

  async function handleSubmit(values: ProfileValues) {
    try {
      if (values.displayName.trim()) {
        const parts = values.displayName.trim().split(/\s+/);
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
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Personalize your profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add a logo and set your display name.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-5">
          {/* Org logo upload */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[var(--radius-xl)] border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary"
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
              data-allow-native
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">Upload organization logo</p>
          </div>

          {/* Display name */}
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5">
                <FormLabel htmlFor="display-name">Display name</FormLabel>
                <Input id="display-name" placeholder="Your full name" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <Button htmlType="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Continue →"}
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
      </Form>
    </div>
  );
}
