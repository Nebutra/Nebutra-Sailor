"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  useCopyToClipboard,
} from "@nebutra/ui/primitives";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export interface CreatedApiKey {
  key: string;
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitRps: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
}

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateApiKeyInput) => Promise<CreatedApiKey>;
  availableScopes?: string[];
  labels?: {
    title?: string;
    description?: string;
    nameLabel?: string;
    namePlaceholder?: string;
    scopesLabel?: string;
    submit?: string;
    submitting?: string;
    close?: string;
    successWarning?: string;
    copy?: string;
    copied?: string;
    confirmClose?: string;
  };
}

const DEFAULT_SCOPES = ["read", "write", "admin"];

const apiKeyFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(64),
  scopes: z.array(z.string()),
});
type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onCreate,
  availableScopes = DEFAULT_SCOPES,
  labels = {},
}: CreateApiKeyDialogProps) {
  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: { name: "", scopes: [] },
  });
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const { copied, copy } = useCopyToClipboard({ timeout: 2000, showToast: false });

  useEffect(() => {
    if (open) {
      form.reset({ name: "", scopes: [] });
      setCreated(null);
    }
  }, [open, form]);

  const text = {
    title: labels.title ?? "Create API key",
    description:
      labels.description ??
      "API keys let external systems talk to Nebutra on your behalf. Treat them like passwords.",
    nameLabel: labels.nameLabel ?? "Name",
    namePlaceholder: labels.namePlaceholder ?? "e.g. Production backend",
    scopesLabel: labels.scopesLabel ?? "Scopes",
    submit: labels.submit ?? "Create key",
    submitting: labels.submitting ?? "Creating…",
    close: labels.close ?? "Close",
    successWarning: labels.successWarning ?? "This key appears once. Store it before closing.",
    copy: labels.copy ?? "Copy",
    copied: labels.copied ?? "Copied",
    confirmClose: labels.confirmClose ?? "Closing hides this key forever. Make sure it is stored.",
  };

  const submitting = form.formState.isSubmitting;

  async function submit(values: ApiKeyFormValues) {
    try {
      const result = await onCreate({ name: values.name.trim(), scopes: values.scopes });
      setCreated(result);
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to create key.",
      });
    }
  }

  function toggleScope(scope: string, currentScopes: string[]) {
    const next = currentScopes.includes(scope)
      ? currentScopes.filter((s) => s !== scope)
      : [...currentScopes, scope];
    form.setValue("scopes", next, { shouldValidate: form.formState.isSubmitted });
  }

  async function handleCopy() {
    if (!created) return;
    await copy(created.key);
  }

  function attemptClose() {
    if (created) {
      const ok = window.confirm(text.confirmClose);
      if (!ok) return;
    }
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      attemptClose();
      return;
    }
    onOpenChange(true);
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-md)] border border-amber-700/30 bg-amber-200 p-4">
              <p className="mb-2 text-sm font-medium text-amber-900">{text.successWarning}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-amber-900 text-xs shadow-inner">
                  {created.key}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="border-amber-700/40 text-amber-900 hover:bg-amber-200/70"
                >
                  {copied ? text.copied : text.copy}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={attemptClose}>
                {text.close}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="mb-1 block text-sm font-medium text-foreground">
                      {text.nameLabel}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        required
                        maxLength={64}
                        placeholder={text.namePlaceholder}
                        disabled={submitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <fieldset>
                      <legend className="mb-2 block text-sm font-medium text-foreground">
                        {text.scopesLabel}
                      </legend>
                      <div className="grid grid-cols-2 gap-2">
                        {availableScopes.map((scope) => (
                          <label
                            key={scope}
                            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <input
                              data-allow-native
                              type="checkbox"
                              name="scopes"
                              value={scope}
                              checked={field.value.includes(scope)}
                              onChange={() => toggleScope(scope, field.value)}
                              disabled={submitting}
                              className="h-4 w-4 rounded border-border text-[hsl(var(--primary))]"
                            />
                            <span>{scope}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {rootError ? <p className="text-sm text-red-900">{rootError}</p> : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={attemptClose}
                  disabled={submitting}
                >
                  {text.close}
                </Button>
                <Button type="submit" variant="ink" disabled={submitting}>
                  {submitting ? text.submitting : text.submit}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
