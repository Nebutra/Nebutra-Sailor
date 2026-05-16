import { CheckCircle } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";

/* ---------------------------------------------------------------------------
 * Visual-only story components
 *
 * The real NewsletterForm depends on next-intl useTranslations and a
 * /api/newsletter endpoint. These replicas reproduce the visual design with
 * hardcoded English strings so the component can be reviewed in Storybook
 * without provider wiring.
 * -------------------------------------------------------------------------- */

const inputClassName =
  "w-48 rounded-lg border border-[color:var(--neutral-7)] bg-[color:var(--neutral-2)] px-3 py-1.5 text-sm text-[color:var(--neutral-12)] placeholder:text-[color:var(--neutral-10)]";

const primaryButtonClassName =
  "rounded-lg bg-[image:var(--brand-gradient)] px-3 py-1.5 text-sm font-medium text-[color:var(--neutral-1)] transition-opacity";

function NewsletterFormIdle() {
  return (
    <form className="flex gap-2">
      <input type="email" readOnly placeholder="you@example.com" className={inputClassName} />
      <button type="button" className={primaryButtonClassName}>
        Subscribe
      </button>
    </form>
  );
}

function NewsletterFormLoading() {
  return (
    <form className="flex gap-2">
      <input type="email" readOnly value="user@example.com" className={inputClassName} />
      <button type="button" disabled className={`${primaryButtonClassName} disabled:opacity-50`}>
        …
      </button>
    </form>
  );
}

function NewsletterFormSuccess() {
  return (
    <div className="flex items-center gap-1.5">
      <CheckCircle className="size-4 text-success" />
      <p className="text-sm text-success">Thanks for subscribing! Check your inbox.</p>
    </div>
  );
}

function NewsletterFormError() {
  return (
    <form className="flex gap-2">
      <input type="email" readOnly value="user@example.com" className={inputClassName} />
      <button type="button" className={primaryButtonClassName}>
        Subscribe
      </button>
      <p className="self-center text-xs text-destructive">Something went wrong. Try again.</p>
    </form>
  );
}

/* -- Meta ---------------------------------------------------------------- */

const meta: Meta<typeof NewsletterFormIdle> = {
  title: "Marketing/NewsletterForm",
  component: NewsletterFormIdle,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Newsletter subscription form used in the landing page footer. Supports idle, loading, success, and error states. " +
          "These stories are visual-only replicas — the real component uses `next-intl` `useTranslations` and a server endpoint.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof NewsletterFormIdle>;

/* -- Stories ------------------------------------------------------------- */

export const Idle: Story = {
  name: "Idle",
  render: () => <NewsletterFormIdle />,
};

export const Loading: Story = {
  name: "Loading",
  render: () => <NewsletterFormLoading />,
};

export const Success: Story = {
  name: "Success",
  render: () => <NewsletterFormSuccess />,
};

export const ErrorState: Story = {
  name: "Error",
  render: () => <NewsletterFormError />,
};

export const InFooterContext: Story = {
  name: "In Footer Context",
  render: () => (
    <div className="rounded-xl bg-[color:var(--neutral-12)] p-8">
      <div className="max-w-xs">
        <h4 className="mb-1 text-sm font-semibold text-[color:var(--neutral-1)]">Stay updated</h4>
        <p className="mb-3 text-xs text-[color:var(--neutral-5)]">
          Get the latest product updates and engineering insights.
        </p>
        <form className="flex gap-2">
          <input
            type="email"
            readOnly
            placeholder="you@example.com"
            className="w-48 rounded-lg border border-[color:var(--neutral-7)] bg-[color:var(--neutral-11)] px-3 py-1.5 text-sm text-[color:var(--neutral-1)] placeholder:text-[color:var(--neutral-5)]"
          />
          <button type="button" className={primaryButtonClassName}>
            Subscribe
          </button>
        </form>
      </div>
    </div>
  ),
};

export const AllVariants: Story = {
  name: "All Variants",
  render: () => (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-12">Idle</h3>
        <NewsletterFormIdle />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-12">Loading</h3>
        <NewsletterFormLoading />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-12">Success</h3>
        <NewsletterFormSuccess />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-12">Error</h3>
        <NewsletterFormError />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-12">In Footer Context (dark)</h3>
        <div className="rounded-xl bg-[color:var(--neutral-12)] p-6">
          <form className="flex gap-2">
            <input
              type="email"
              readOnly
              placeholder="you@example.com"
              className="w-48 rounded-lg border border-[color:var(--neutral-7)] bg-[color:var(--neutral-11)] px-3 py-1.5 text-sm text-[color:var(--neutral-1)] placeholder:text-[color:var(--neutral-5)]"
            />
            <button type="button" className={primaryButtonClassName}>
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  ),
};
