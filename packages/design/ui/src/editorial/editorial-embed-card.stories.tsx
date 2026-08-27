import type { Meta, StoryObj } from "@storybook/react";
import { EDITORIAL_EMBED_PROVIDERS, EditorialEmbedCard } from "./editorial-embed-card";

const meta: Meta<typeof EditorialEmbedCard> = {
  title: "Editorial/EmbedCard",
  component: EditorialEmbedCard,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Link-out card for third-party media. Deliberately not an iframe: an embedded player ships the provider's scripts and cookies into the article and shifts layout while it loads.",
      },
    },
  },
  argTypes: {
    provider: { control: "select", options: EDITORIAL_EMBED_PROVIDERS },
  },
};

export default meta;
type Story = StoryObj<typeof EditorialEmbedCard>;

export const Website: Story = {
  args: {
    provider: "website",
    title: "Production Runtime Closure and Deploy Target Switchability",
    url: "https://nebutra.com/blog/production-runtime-closure",
  },
};

export const AllProviders: Story = {
  name: "All providers",
  render: () => (
    <div className="max-w-2xl">
      <EditorialEmbedCard
        provider="youtube"
        title="Manus demo walkthrough"
        url="https://www.youtube.com/watch?v=example"
      />
      <EditorialEmbedCard provider="x" title="Vibe Code Game Jam" url="https://x.com/levelsio" />
      <EditorialEmbedCard
        provider="github"
        title="Nebutra/Nebutra-Sailor"
        url="https://github.com/Nebutra/Nebutra-Sailor"
      />
      <EditorialEmbedCard
        provider="website"
        title="Trading Margin for Moat"
        url="https://a16z.com/trading-margin-for-moat/"
        caption="Referenced in section 4."
      />
    </div>
  ),
};
