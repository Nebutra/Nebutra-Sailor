import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Input } from "./input";
import { Textarea } from "./textarea";

/**
 * `Form` is the react-hook-form binding layer: 20 files in `apps/web` route
 * through it, more than any other component on the storyless list, and until now
 * it had no visual or behavioural regression surface at all.
 *
 * What it actually contributes over a bare `<form>` is the **ARIA wiring**, and
 * that is the whole reason it needs a story rather than a screenshot. `FormItem`
 * mints one `useId`; `FormLabel` points `htmlFor` at `${id}-form-item`;
 * `FormControl` (a `Slot`, so the id lands on whatever child you pass) sets that
 * same id plus `aria-invalid` and an `aria-describedby` that switches from
 * `description` alone to `description + message` the moment the field errors;
 * `FormMessage` renders `error.message` and returns `null` when there is none.
 * Break any link in that chain and the form still *looks* right — which is why
 * `AriaWiring` and `ValidationErrors` assert the attributes instead of trusting
 * the pixels.
 *
 * No resolver here on purpose: the library does not depend on zod or
 * `@hookform/resolvers`, and product code that does (every consumer) gets the
 * identical `fieldState.error` shape from `rules`.
 */

const meta = {
  title: "Primitives/Form",
  component: FormItem,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "react-hook-form binding for the primitives. Wraps FormProvider and supplies label/description/error ARIA wiring through FormItem's generated id. Use Field for a static, uncontrolled label+error shell instead.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FormItem>;

export default meta;
type Story = StoryObj<typeof FormItem>;

/* ------------------------------------------------------------------ *
 * Fixture
 * ------------------------------------------------------------------ */

interface ProfileValues {
  displayName: string;
  email: string;
  slug: string;
  bio: string;
}

const EMPTY: ProfileValues = { displayName: "", email: "", slug: "", bio: "" };

type Submission = "idle" | "submitting" | "error" | "success";

interface ProfileFormProps {
  defaultValues?: Partial<ProfileValues>;
  /** Forces the async submit outcome so the error and success rows are reachable. */
  outcome?: "success" | "error";
  /** Pre-populate errors on mount, for the docs snapshot of the invalid state. */
  showErrorsOnMount?: boolean;
  disabled?: boolean;
}

function ProfileForm({
  defaultValues,
  outcome = "success",
  showErrorsOnMount = false,
  disabled = false,
}: ProfileFormProps) {
  const form = useForm<ProfileValues>({
    defaultValues: { ...EMPTY, ...defaultValues },
    mode: "onSubmit",
  });
  const [submission, setSubmission] = React.useState<Submission>("idle");
  const [formError, setFormError] = React.useState("");
  const [savedName, setSavedName] = React.useState("");

  // The invalid state has to be reachable without a click for the docs page and
  // for any snapshot; triggering validation on mount is how react-hook-form
  // exposes it.
  React.useEffect(() => {
    if (showErrorsOnMount) void form.trigger();
  }, [showErrorsOnMount, form]);

  async function onSubmit(values: ProfileValues): Promise<void> {
    setFormError("");
    setSavedName(values.displayName);
    setSubmission("submitting");
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (outcome === "error") {
      setSubmission("error");
      // Server-side field error, folded back into the same channel as a client
      // rule so FormMessage/aria-describedby behave identically.
      form.setError("email", { type: "server", message: "That address is already in use" });
      setFormError("Could not save your profile");
      return;
    }
    setSubmission("success");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="flex w-[420px] flex-col gap-5"
      >
        <FormField
          control={form.control}
          name="displayName"
          rules={{
            required: "Display name is required",
            minLength: { value: 2, message: "Use at least 2 characters" },
            maxLength: { value: 60, message: "Keep it under 60 characters" },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input placeholder="Ada Lovelace" disabled={disabled} {...field} />
              </FormControl>
              <FormDescription>Shown to everyone in your workspace.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          rules={{
            required: "Email is required",
            pattern: { value: /.+@.+\..+/, message: "Enter a valid email address" },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ada@example.com" disabled={disabled} {...field} />
              </FormControl>
              <FormDescription>Used for sign-in and receipts.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          rules={{ maxLength: { value: 160, message: "Keep it under 160 characters" } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="One line about you"
                  disabled={disabled}
                  {...field}
                />
              </FormControl>
              <FormDescription>Optional. Markdown is not rendered.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* A `validate` rule rather than a built-in one: react-hook-form puts
            all four rule kinds on the same `fieldState.error` channel, so
            FormMessage and the describedby wiring cannot tell them apart. */}
        <FormField
          control={form.control}
          name="slug"
          rules={{
            required: "Workspace URL is required",
            validate: (value) =>
              /^[a-z0-9-]+$/.test(value) || "Lowercase letters, numbers and dashes only",
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace URL</FormLabel>
              <FormControl>
                <Input placeholder="ada-lovelace" disabled={disabled} {...field} />
              </FormControl>
              <FormDescription>example.com/ada-lovelace</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form-level failure is a separate channel from field errors and needs
            its own announcement — a field message is only read when the field
            takes focus. */}
        {formError ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        ) : null}
        {submission === "success" ? (
          <p role="status" className="text-sm font-medium text-[color:hsl(var(--success-strong))]">
            Saved profile for {savedName}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={disabled || submission === "submitting"}>
            {submission === "submitting" ? "Saving…" : "Save profile"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => form.reset()} disabled={disabled}>
            Reset
          </Button>
        </div>
      </form>
    </Form>
  );
}

/* ------------------------------------------------------------------ *
 * Stories
 * ------------------------------------------------------------------ */

export const Default: Story = {
  render: () => <ProfileForm />,
};

/**
 * Every state side by side: pristine, invalid (all four rules firing), filled and
 * valid, disabled, and overflow — a value longer than the control and a message
 * long enough to wrap under it.
 */
export const AllVariants: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap items-start gap-10">
      <Labelled title="Pristine">
        <ProfileForm />
      </Labelled>
      <Labelled title="Invalid — every rule firing">
        <ProfileForm showErrorsOnMount />
      </Labelled>
      <Labelled title="Filled and valid">
        <ProfileForm
          defaultValues={{
            displayName: "Ada Lovelace",
            email: "ada@example.com",
            slug: "ada-lovelace",
            bio: "Wrote the first algorithm.",
          }}
        />
      </Labelled>
      <Labelled title="Disabled">
        <ProfileForm
          disabled
          defaultValues={{
            displayName: "Ada Lovelace",
            email: "ada@example.com",
            slug: "ada-lovelace",
          }}
        />
      </Labelled>
      <Labelled title="Overflow — long value, wrapping message">
        <ProfileForm
          showErrorsOnMount
          defaultValues={{
            displayName:
              "Augusta Ada King-Noel Countess of Lovelace and Assorted Adjacent Territories",
            bio: "x".repeat(220),
          }}
        />
      </Labelled>
    </div>
  ),
};

function Labelled({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

/** Nothing typed, nothing validated — the shape a user first meets. */
export const EmptyState: Story = {
  render: () => <ProfileForm />,
};

/** Mid-submit: the primary action is disabled and relabelled, layout unmoved. */
export const SubmittingState: Story = {
  render: () => <ProfileForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Display name"), "Ada Lovelace");
    await userEvent.type(canvas.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(canvas.getByLabelText("Workspace URL"), "ada-lovelace");
    await userEvent.click(canvas.getByRole("button", { name: "Save profile" }));
    await expect(canvas.getByRole("button", { name: "Saving…" })).toBeDisabled();
  },
};

/** Server rejection: a form-level `role="alert"` plus a field error on `email`. */
export const ErrorState: Story = {
  render: () => <ProfileForm outcome="error" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Display name"), "Ada Lovelace");
    await userEvent.type(canvas.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(canvas.getByLabelText("Workspace URL"), "ada-lovelace");
    await userEvent.click(canvas.getByRole("button", { name: "Save profile" }));

    await waitFor(() =>
      expect(canvas.getByRole("alert")).toHaveTextContent("Could not save your profile"),
    );
    // A server error must reach the same aria-invalid / describedby wiring a
    // client rule would.
    await expect(canvas.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByText("That address is already in use")).toBeInTheDocument();
  },
};

export const SuccessState: Story = {
  render: () => <ProfileForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Display name"), "Ada Lovelace");
    await userEvent.type(canvas.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(canvas.getByLabelText("Workspace URL"), "ada-lovelace");
    await userEvent.click(canvas.getByRole("button", { name: "Save profile" }));
    await waitFor(() =>
      expect(canvas.getByRole("status")).toHaveTextContent("Saved profile for Ada Lovelace"),
    );
  },
};

/** A value wider than the control and a message long enough to wrap beneath it. */
export const LongContent: Story = {
  render: () => (
    <ProfileForm
      showErrorsOnMount
      defaultValues={{
        displayName: "Augusta Ada King-Noel Countess of Lovelace and Assorted Adjacent Territories",
        bio: "x".repeat(220),
      }}
    />
  ),
};

export const Disabled: Story = {
  render: () => (
    <ProfileForm
      disabled
      defaultValues={{
        displayName: "Ada Lovelace",
        email: "ada@example.com",
        slug: "ada-lovelace",
      }}
    />
  ),
};

/**
 * Every client rule firing at once. `FormMessage` returns `null` when clean, so
 * a pristine form has no reserved space for it and the layout shifts down as
 * messages appear — real behaviour, shown rather than hidden.
 */
export const ValidationErrors: Story = {
  render: () => <ProfileForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(canvas.getByText("Display name is required")).toBeInTheDocument());
    await expect(canvas.getByText("Email is required")).toBeInTheDocument();
    await expect(canvas.getByText("Workspace URL is required")).toBeInTheDocument();
    // Bio is optional and under its max, so its message must stay unrendered.
    await expect(canvas.queryByText("Keep it under 160 characters")).toBeNull();

    // A per-rule message, not just "required".
    await userEvent.type(canvas.getByLabelText("Display name"), "A");
    await userEvent.click(canvas.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(canvas.getByText("Use at least 2 characters")).toBeInTheDocument());

    await userEvent.type(canvas.getByLabelText("Email"), "not-an-email");
    await userEvent.click(canvas.getByRole("button", { name: "Save profile" }));
    await waitFor(() =>
      expect(canvas.getByText("Enter a valid email address")).toBeInTheDocument(),
    );
  },
};

/**
 * The contract that makes this component worth having. Asserted, not described:
 * label→control association, `aria-invalid` flipping, and `aria-describedby`
 * growing from `description` to `description message` when the field errors —
 * so a screen reader reads the hint *and* the failure, in that order.
 */
export const AriaWiring: Story = {
  render: () => <ProfileForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const email = canvas.getByLabelText("Email");

    // FormLabel's htmlFor and FormControl's id are the same generated value —
    // getByLabelText already proves the association, so assert the invariant the
    // id shape depends on.
    const controlId = email.getAttribute("id");
    await expect(controlId).toMatch(/-form-item$/);

    // Clean: described by the description only, and not marked invalid.
    //
    // FormControl passes `aria-invalid={false}`, but `Input` normalizes it to
    // `undefined` (`resolvedInvalid || undefined`), so the attribute is *absent*
    // rather than `"false"`. Asserted as absence deliberately — the earlier
    // guess of `"false"` failed here, which is the whole argument for a story
    // that checks attributes instead of describing them.
    await expect(email).not.toHaveAttribute("aria-invalid");
    const cleanDescribedBy = email.getAttribute("aria-describedby") ?? "";
    await expect(cleanDescribedBy).toBe(`${controlId}-description`);
    await expect(document.getElementById(cleanDescribedBy)).toHaveTextContent(
      "Used for sign-in and receipts.",
    );

    // Errored: invalid, and described by description AND message.
    await userEvent.click(canvas.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));

    const erroredDescribedBy = email.getAttribute("aria-describedby") ?? "";
    const ids = erroredDescribedBy.split(/\s+/);
    await expect(ids).toHaveLength(2);
    await expect(ids[0]).toBe(cleanDescribedBy);
    await expect(document.getElementById(ids[1] as string)).toHaveTextContent("Email is required");
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" }, layout: "padded" },
  render: () => (
    <div className="[&>form]:w-full">
      <ProfileForm />
    </div>
  ),
};

export const DarkMode: Story = {
  parameters: { layout: "padded" },
  decorators: [
    (StoryFn) => (
      <div className="dark flex justify-center bg-background p-8 text-foreground">
        <StoryFn />
      </div>
    ),
  ],
  render: () => <ProfileForm showErrorsOnMount />,
};
