import { RadioGroupCard, RadioGroupCardItem } from "@nebutra/ui/primitives";
import { CreditCard, Landmark, Smartphone } from "lucide-react";

export function RadioGroupCardDemo() {
  return (
    <div className="max-w-3xl px-4 py-8 w-full">
      <RadioGroupCard defaultValue="card" className="gap-3 grid grid-cols-3">
        <RadioGroupCardItem value="card" id="pay-card">
          <CreditCard className="mb-4 h-6 w-6 text-muted-foreground" />
          <div className="font-medium">Card</div>
          <div className="text-xs mt-1 text-balance text-muted-foreground">Visa, Mastercard</div>
        </RadioGroupCardItem>
        <RadioGroupCardItem value="bank" id="pay-bank">
          <Landmark className="mb-4 h-6 w-6 text-muted-foreground" />
          <div className="font-medium">Bank</div>
          <div className="text-xs mt-1 text-balance text-muted-foreground">Direct transfer</div>
        </RadioGroupCardItem>
        <RadioGroupCardItem value="mobile" id="pay-mobile">
          <Smartphone className="mb-4 h-6 w-6 text-muted-foreground" />
          <div className="font-medium">Mobile</div>
          <div className="text-xs mt-1 text-balance text-muted-foreground">
            Apple Pay, Google Pay
          </div>
        </RadioGroupCardItem>
      </RadioGroupCard>
    </div>
  );
}
