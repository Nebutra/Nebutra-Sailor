"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@nebutra/ui/components";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@nebutra/ui/primitives";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

interface CreateWorkspaceStepProps {
  onComplete: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const schema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .refine((slug) => /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug) || slug.length >= 3, {
      message: "3–48 characters, lowercase letters, numbers, and hyphens only.",
    }),
});
type Values = z.infer<typeof schema>;

export function CreateWorkspaceStep({ onComplete }: CreateWorkspaceStepProps) {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
    mode: "onSubmit",
  });

  const { setError, watch, setValue, setFocus } = form;
  const name = watch("name");

  // Auto-derive the slug from the name until the user edits the slug directly.
  const slugDirty = form.getFieldState("slug").isDirty;
  useEffect(() => {
    if (!slugDirty) {
      setValue("slug", slugify(name));
    }
  }, [name, slugDirty, setValue]);

  useEffect(() => {
    setFocus("name");
  }, [setFocus]);

  async function submit(values: Values) {
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, slug: values.slug }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError("root", { message: data.error || "Failed to create workspace." });
        return;
      }

      const result = await response.json();
      // Set the organization context before completing
      if (result.organizationId) {
        router.refresh();
      }

      onComplete();
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to create workspace.",
      });
    }
  }

  const loading = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Set up your workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is where your team will collaborate.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5 space-y-0">
                <FormLabel>Workspace name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Acme Corp" required {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1.5 space-y-0">
                <FormLabel>Workspace URL</FormLabel>
                <div className="flex items-center rounded-[var(--radius-md)] border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <span className="select-none border-r border-input px-3 py-2 text-sm text-muted-foreground">
                    nebutra.app /
                  </span>
                  <FormControl>
                    <Input
                      placeholder="my-workspace"
                      pattern="[a-z0-9][a-z0-9\-]{1,46}[a-z0-9]"
                      required
                      {...field}
                      onChange={(e) => {
                        field.onChange(slugify(e.target.value) || e.target.value.toLowerCase());
                      }}
                    />
                  </FormControl>
                </div>
                <FormMessage className="text-xs text-muted-foreground" />
              </FormItem>
            )}
          />

          {rootError && <p className="text-sm text-destructive">{rootError}</p>}

          <Button htmlType="submit" className="w-full" disabled={loading || !name}>
            {loading ? "Creating…" : "Create Workspace →"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
