import { FeatureCheckItem } from "@nebutra/ui/primitives";
import { ShieldCheck, Star } from "lucide-react";

export function FeatureCheckItemDemo() {
  return (
    <div className="gap-8 max-w-md p-8 my-8 mx-auto flex w-full flex-col rounded-xl border bg-background shadow-sm">
      <div>
        <h3 className="text-lg font-semibold mb-4">Pricing Plan Includes</h3>
        <div className="gap-4 flex flex-col">
          <FeatureCheckItem
            title="Unlimited Projects"
            description="Create as many projects as you need without any limits."
          />
          <FeatureCheckItem
            title="Custom Domains"
            description="Connect your own domains with automated SSL generation."
          />
          <FeatureCheckItem
            title="Team Collaboration"
            description="Invite unlimited team members with role-based access control."
          />
          <FeatureCheckItem title="Advanced Analytics" />
        </div>
      </div>

      <div className="pt-6 mt-2 border-t">
        <h3 className="text-sm font-semibold mb-4 tracking-wider text-muted-foreground uppercase">
          Custom Icons
        </h3>
        <div className="gap-4 flex flex-col">
          <FeatureCheckItem
            icon={Star}
            iconClassName="text-amber-500"
            title="Premium Support"
            description="24/7 priority support via email and Slack."
          />
          <FeatureCheckItem
            icon={ShieldCheck}
            iconClassName="text-emerald-500"
            title="Enterprise Security"
            description="SSO, audit logs, and compliance reporting."
          />
        </div>
      </div>
    </div>
  );
}
