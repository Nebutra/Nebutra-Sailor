import type { Meta, StoryObj } from "@storybook/react";
import { Building, Check, Lock, Star, Zap } from "lucide-react";
import { PricingCard } from "./pricing-card";

const meta = {
  title: "Primitives/PricingCard",
  component: PricingCard.Card,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Composable pricing card with glass-effect header, plan name, badge, price display with optional strikethrough, and feature list with separators.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof PricingCard.Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const features = ["Unlimited projects", "API access", "Priority support", "Custom domain"];
const lockedFeatures = ["SSO", "Advanced analytics", "SLA guarantee"];

export const Default: Story = {
  render: () => (
    <PricingCard.Card>
      <PricingCard.Header>
        <PricingCard.Plan>
          <PricingCard.PlanName>
            <Zap />
            Pro
          </PricingCard.PlanName>
          <PricingCard.Badge>Popular</PricingCard.Badge>
        </PricingCard.Plan>
        <PricingCard.Price>
          <PricingCard.MainPrice>$29</PricingCard.MainPrice>
          <PricingCard.Period>/month</PricingCard.Period>
        </PricingCard.Price>
        <PricingCard.Description>Per workspace, billed annually</PricingCard.Description>
      </PricingCard.Header>
      <PricingCard.Body>
        <PricingCard.List>
          {features.map((f) => (
            <PricingCard.ListItem key={f}>
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              {f}
            </PricingCard.ListItem>
          ))}
        </PricingCard.List>
      </PricingCard.Body>
    </PricingCard.Card>
  ),
};

export const WithOriginalPrice: Story = {
  render: () => (
    <PricingCard.Card>
      <PricingCard.Header>
        <PricingCard.Plan>
          <PricingCard.PlanName>Pro</PricingCard.PlanName>
          <PricingCard.Badge>50% OFF</PricingCard.Badge>
        </PricingCard.Plan>
        <PricingCard.Price>
          <PricingCard.OriginalPrice>$49</PricingCard.OriginalPrice>
          <PricingCard.MainPrice>$29</PricingCard.MainPrice>
          <PricingCard.Period>/month</PricingCard.Period>
        </PricingCard.Price>
        <PricingCard.Description>Limited time offer</PricingCard.Description>
      </PricingCard.Header>
      <PricingCard.Body>
        <PricingCard.List>
          {features.map((f) => (
            <PricingCard.ListItem key={f}>
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              {f}
            </PricingCard.ListItem>
          ))}
        </PricingCard.List>
      </PricingCard.Body>
    </PricingCard.Card>
  ),
};

export const WithSeparator: Story = {
  render: () => (
    <PricingCard.Card>
      <PricingCard.Header>
        <PricingCard.Plan>
          <PricingCard.PlanName>Starter</PricingCard.PlanName>
        </PricingCard.Plan>
        <PricingCard.Price>
          <PricingCard.MainPrice>$9</PricingCard.MainPrice>
          <PricingCard.Period>/month</PricingCard.Period>
        </PricingCard.Price>
      </PricingCard.Header>
      <PricingCard.Body>
        <PricingCard.List>
          {["5 projects", "1GB storage", "Email support"].map((f) => (
            <PricingCard.ListItem key={f}>
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              {f}
            </PricingCard.ListItem>
          ))}
        </PricingCard.List>
        <PricingCard.Separator>Upgrade to unlock</PricingCard.Separator>
        <PricingCard.List>
          {lockedFeatures.map((f) => (
            <PricingCard.ListItem key={f} className="opacity-50">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {f}
            </PricingCard.ListItem>
          ))}
        </PricingCard.List>
      </PricingCard.Body>
    </PricingCard.Card>
  ),
};

export const ThreeTiers: Story = {
  render: () => (
    <div className="flex gap-4 items-start">
      {[
        {
          name: "Starter",
          Icon: Star,
          price: "$9",
          badge: null,
          period: "/month",
        },
        {
          name: "Pro",
          Icon: Zap,
          price: "$29",
          badge: "Popular",
          period: "/month",
        },
        {
          name: "Enterprise",
          Icon: Building,
          price: "Custom",
          badge: null,
          period: "",
        },
      ].map(({ name, Icon, price, badge, period }) => (
        <PricingCard.Card key={name}>
          <PricingCard.Header>
            <PricingCard.Plan>
              <PricingCard.PlanName>
                <Icon />
                {name}
              </PricingCard.PlanName>
              {badge && <PricingCard.Badge>{badge}</PricingCard.Badge>}
            </PricingCard.Plan>
            <PricingCard.Price>
              <PricingCard.MainPrice>{price}</PricingCard.MainPrice>
              {period && <PricingCard.Period>{period}</PricingCard.Period>}
            </PricingCard.Price>
          </PricingCard.Header>
          <PricingCard.Body>
            <PricingCard.List>
              {features.slice(0, name === "Starter" ? 2 : features.length).map((f) => (
                <PricingCard.ListItem key={f}>
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  {f}
                </PricingCard.ListItem>
              ))}
            </PricingCard.List>
          </PricingCard.Body>
        </PricingCard.Card>
      ))}
    </div>
  ),
};

export const NoGlassEffect: Story = {
  render: () => (
    <PricingCard.Card>
      <PricingCard.Header glassEffect={false}>
        <PricingCard.Plan>
          <PricingCard.PlanName>Pro</PricingCard.PlanName>
        </PricingCard.Plan>
        <PricingCard.Price>
          <PricingCard.MainPrice>$29</PricingCard.MainPrice>
          <PricingCard.Period>/month</PricingCard.Period>
        </PricingCard.Price>
      </PricingCard.Header>
      <PricingCard.Body>
        <p className="text-xs text-muted-foreground">Glass effect disabled on header.</p>
      </PricingCard.Body>
    </PricingCard.Card>
  ),
};
