"use client";

import { PricingCard } from "@nebutra/ui/primitives";
import { Check, Zap } from "lucide-react";

export function PricingCardDemo() {
  const features = ["Unlimited projects", "API access", "Priority support"];

  return (
    <PricingCard.Card>
      <PricingCard.Header>
        <PricingCard.Plan>
          <PricingCard.PlanName>
            <Zap className="mr-2 h-4 w-4" />
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
  );
}
