import type { Meta, StoryObj } from "@storybook/react";
import { EditorialDataTable } from "./editorial-data-table";
import { editorialReadingColumnDecorator } from "./story-decorators";

const meta: Meta<typeof EditorialDataTable> = {
  // The leaf segment has to be the exact component name. The story-coverage
  // ratchet reads it as the subject under test, so a leaf of "DataTable" here
  // silently marked the unrelated patterns/data-table component as covered.
  title: "Editorial/EditorialDataTable",
  component: EditorialDataTable,
  tags: ["autodocs"],
  decorators: [editorialReadingColumnDecorator],
  parameters: {
    docs: {
      description: {
        component:
          "Table rendered from author-written markup, where cells carry links, code and inline math. Cells are `ReactNode`, so unlike ComparisonTable it scrolls rather than restacking.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialDataTable>;

export const Default: Story = {
  args: {
    head: ["Package", "Providers", "Env override"],
    rows: [
      {
        key: "queue",
        cells: [
          <code key="c">@nebutra/queue</code>,
          "QStash | memory",
          <code key="e">QUEUE_PROVIDER</code>,
        ],
      },
      {
        key: "search",
        cells: [
          <code key="c">@nebutra/search</code>,
          "pgvector",
          <code key="e">SEARCH_PROVIDER</code>,
        ],
      },
      {
        key: "billing",
        cells: [
          <code key="c">@nebutra/billing</code>,
          "Stripe | ChinaPay",
          <code key="e">BILLING_PROVIDER</code>,
        ],
      },
    ],
    caption: "Provider-agnostic packages auto-detect from environment.",
  },
};

export const WithLinks: Story = {
  name: "Cells with links",
  args: {
    head: ["Source", "Publisher"],
    rows: [
      {
        key: "a16z",
        cells: [
          <a key="l" href="https://a16z.com/trading-margin-for-moat/">
            Trading Margin for Moat
          </a>,
          "a16z",
        ],
      },
      {
        key: "yc",
        cells: [
          <a key="l" href="https://www.ycombinator.com/">
            Intelligence on tap
          </a>,
          "Y Combinator",
        ],
      },
    ],
  },
};
