import type { Meta, StoryObj } from "@storybook/react";
import { FAQ } from "./FAQ";

const meta: Meta<typeof FAQ> = {
  title: "Marketing/FAQ",
  component: FAQ,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

const faqs = [
  {
    question: "Can I swap the auth provider later?",
    answer:
      "Yes. Auth is selected by config, and the product code depends on the shared interface rather than a vendor SDK.",
    category: "Architecture",
  },
  {
    question: "Does this work without Kubernetes?",
    answer:
      "The default topology is edge Workers in front of a single origin. Kubernetes is one of several deploy targets, not a requirement.",
    category: "Deployment",
  },
  {
    question: "How is tenant data isolated?",
    answer:
      "Every tenant-scoped table carries tenant_id and is protected by row-level security, enforced by the database rather than by application filters.",
    category: "Security",
  },
  {
    question: "What happens when a provider goes down?",
    answer:
      "Provider failures degrade to the next configured upstream where the capability allows it; the rest surface as explicit errors rather than silent data loss.",
    category: "Operations",
  },
];

type Story = StoryObj<typeof FAQ>;

export const Accordion: Story = { args: { layout: "accordion", items: faqs } };
export const TwoColumn: Story = { args: { layout: "two-column", items: faqs } };
export const Cards: Story = { args: { layout: "cards", items: faqs } };
