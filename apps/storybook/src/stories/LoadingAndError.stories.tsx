import { ErrorState, LoadingState } from "@nebutra/ui/layout";
import type { Meta, StoryObj } from "@storybook/react";

// ── LoadingState ─────────────────────────────────────────────────────────────

const loadingMeta: Meta<typeof LoadingState> = {
  title: "Layout/LoadingState",
  component: LoadingState,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Centred spinner used as a React Suspense fallback.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["small", "medium", "large"] },
  },
};
export default loadingMeta;

type LoadingStory = StoryObj<typeof LoadingState>;

export const Default: LoadingStory = { args: {} };

export const WithMessage: LoadingStory = {
  args: { message: "Loading analytics data…" },
};

export const AllSizes: LoadingStory = {
  render: () => (
    <div className="flex items-center gap-10 p-6">
      <LoadingState size="small" message="small" />
      <LoadingState size="medium" message="medium" />
      <LoadingState size="large" message="large" />
    </div>
  ),
};

// ── ErrorState ───────────────────────────────────────────────────────────────
// Note: placing ErrorState in the same file to avoid duplicate default exports.
// Access it under Layout/ErrorState in Storybook via composition story below.

export const ErrorExample: StoryObj = {
  render: () => (
    <ErrorState
      title="Failed to load data"
      message="The server returned a 503 error. Please try again."
      onRetry={() => alert("Retrying…")}
    />
  ),
  name: "ErrorState / With Retry",
};

export const ErrorNoRetry: StoryObj = {
  render: () => (
    <ErrorState title="Access denied" message="You do not have permission to view this resource." />
  ),
  name: "ErrorState / No Retry",
};
