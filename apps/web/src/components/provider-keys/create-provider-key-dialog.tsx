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
  Select,
} from "@nebutra/ui/primitives";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PROVIDER_LABELS, type ProviderId } from "./provider-keys-list";

export interface CreateProviderKeyInput {
  provider: ProviderId;
  apiKey: string;
  baseUrl?: string;
  label?: string;
  alwaysUse: boolean;
}

interface CreateProviderKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateProviderKeyInput) => Promise<unknown>;
}

const PROVIDERS: ProviderId[] = ["OPENAI", "ANTHROPIC", "GOOGLE", "SILICONFLOW", "CUSTOM"];

const formSchema = z
  .object({
    provider: z.enum(["OPENAI", "ANTHROPIC", "GOOGLE", "SILICONFLOW", "CUSTOM"]),
    apiKey: z.string().trim().min(8, "Enter a valid API key.").max(400),
    baseUrl: z.string().trim().url("Enter a valid URL.").max(300).optional().or(z.literal("")),
    label: z.string().trim().max(80).optional(),
    alwaysUse: z.boolean(),
  })
  .refine((v) => v.provider !== "CUSTOM" || (v.baseUrl && v.baseUrl.length > 0), {
    message: "A base URL is required for custom providers.",
    path: ["baseUrl"],
  });
type FormValues = z.infer<typeof formSchema>;

export function CreateProviderKeyDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateProviderKeyDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { provider: "OPENAI", apiKey: "", baseUrl: "", label: "", alwaysUse: false },
  });

  useEffect(() => {
    if (open) {
      form.reset({ provider: "OPENAI", apiKey: "", baseUrl: "", label: "", alwaysUse: false });
    }
  }, [open, form]);

  const submitting = form.formState.isSubmitting;
  const provider = form.watch("provider");
  const rootError = form.formState.errors.root?.message;

  async function submit(values: FormValues) {
    try {
      await onCreate({
        provider: values.provider,
        apiKey: values.apiKey.trim(),
        ...(values.baseUrl ? { baseUrl: values.baseUrl.trim() } : {}),
        ...(values.label ? { label: values.label.trim() } : {}),
        alwaysUse: values.alwaysUse,
      });
      onOpenChange(false);
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to save provider key.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add provider key</DialogTitle>
          <DialogDescription>
            Bring your own AI provider key. It is encrypted at rest and used in preference to the
            platform key for matching models.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="mb-1 block text-sm font-medium text-foreground">
                    Provider
                  </FormLabel>
                  <FormControl>
                    <Select
                      size="small"
                      disabled={submitting}
                      value={field.value}
                      onValueChange={(v) => {
                        if (v) field.onChange(v);
                      }}
                      options={PROVIDERS.map((p) => ({
                        value: p,
                        label: PROVIDER_LABELS[p],
                      }))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="mb-1 block text-sm font-medium text-foreground">
                    API key
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="off"
                      required
                      placeholder="sk-…"
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
              name="baseUrl"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="mb-1 block text-sm font-medium text-foreground">
                    Base URL{" "}
                    <span className="font-normal text-muted-foreground">
                      {provider === "CUSTOM" ? "(required)" : "(optional)"}
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://api.openai.com/v1"
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
              name="label"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="mb-1 block text-sm font-medium text-foreground">
                    Label <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      maxLength={80}
                      placeholder="e.g. Production"
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
              name="alwaysUse"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <label className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm text-foreground">
                    <input
                      data-allow-native
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={submitting}
                      className="mt-0.5 h-4 w-4 rounded border-border text-[hsl(var(--primary))]"
                    />
                    <span>
                      Always use this key
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Never fall back to the platform key for this provider. Requests fail if your
                        key is exhausted.
                      </span>
                    </span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

            {rootError ? <p className="text-sm text-red-900">{rootError}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="ink" disabled={submitting}>
                {submitting ? "Saving…" : "Save key"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
