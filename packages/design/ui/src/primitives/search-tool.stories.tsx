import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { type SearchResult, SearchTool } from "./search-tool";

const meta: Meta<typeof SearchTool> = {
  title: "Primitives/SearchTool",
  component: SearchTool,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Inline AI tool-call rendering for search/retrieval. Sibling of " +
          "EditTool / QuestionTool / McpTool / TodoTool. Rows with `url` " +
          "render as real anchors (no fake-clickable hover).",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SearchTool>;

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                  */
/* -------------------------------------------------------------------------- */

const linkedResults: SearchResult[] = [
  {
    title: "United UA837 SFO→NRT · $1,105 economy",
    source: "google.com/flights",
    url: "https://www.google.com/flights",
  },
  {
    title: "SFO–Tokyo · 14 results from $1,089",
    source: "expedia.com",
    date: "Updated 12m ago",
    url: "https://www.expedia.com",
  },
  {
    title: "ANA NH7 Direct SFO→NRT · $1,240 rt",
    source: "google.com/flights",
    url: "https://www.google.com/flights",
  },
];

const inertResults: SearchResult[] = [
  { title: "Audit components", source: "Notion" },
  { title: "Tighten spacing", source: "Notion", date: "2026-05-12" },
  { title: "Ship updates", source: "Linear" },
];

/* -------------------------------------------------------------------------- */
/*  Stories                                                                   */
/* -------------------------------------------------------------------------- */

export const CompletedLinked: Story = {
  name: "Completed — clickable (anchors)",
  render: () => (
    <div className="w-[520px]">
      <SearchTool query="best flights to Tokyo" results={linkedResults} defaultOpen />
    </div>
  ),
};

export const CompletedInert: Story = {
  name: "Completed — read-only (no urls)",
  parameters: {
    docs: {
      description: {
        story:
          "When results lack a `url`, rows render as inert `<li>` without hover affordance. Honest clickability — no fake interactivity.",
      },
    },
  },
  render: () => (
    <div className="w-[520px]">
      <SearchTool query="weekly tasks" results={inertResults} defaultOpen />
    </div>
  ),
};

export const Pending: Story = {
  name: "Pending (shimmer)",
  render: () => (
    <div className="w-[520px]">
      <SearchTool state="pending" query="best flights to Tokyo" />
    </div>
  ),
};

export const ZeroResults: Story = {
  name: "Completed — zero results",
  parameters: {
    docs: {
      description: {
        story: 'Empty results array renders the "Found 0 results" header but no expand affordance.',
      },
    },
  },
  render: () => (
    <div className="w-[520px]">
      <SearchTool query="lichen taxonomy" results={[]} />
    </div>
  ),
};

export const SingleResult: Story = {
  name: "Single result (plural grammar)",
  render: () => (
    <div className="w-[520px]">
      <SearchTool query="ada lovelace 1843" results={[linkedResults[0]!]} defaultOpen />
    </div>
  ),
};

export const Controlled: Story = {
  name: "Controlled expand",
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="w-[520px] space-y-3">
        <SearchTool
          query="best flights to Tokyo"
          results={linkedResults}
          expanded={open}
          onExpandedChange={setOpen}
        />
        <pre className="rounded-md bg-muted p-3 text-xs text-foreground">
          expanded = {String(open)}
        </pre>
      </div>
    );
  },
};

export const LongList: Story = {
  name: "Long result list (scroll container)",
  parameters: {
    docs: {
      description: {
        story:
          "Result panel scrolls at `maxResultsHeightPx` (default 200px). Override per-instance for surfaces that want a taller well.",
      },
    },
  },
  render: () => {
    const many: SearchResult[] = Array.from({ length: 20 }, (_, i) => ({
      title: `Result ${i + 1} — lorem ipsum dolor sit amet`,
      source: i % 2 === 0 ? "google.com" : "Notion",
      url: i % 2 === 0 ? `https://example.com/${i}` : undefined,
    }));
    return (
      <div className="w-[520px]">
        <SearchTool query="lorem" results={many} defaultOpen />
      </div>
    );
  },
};
