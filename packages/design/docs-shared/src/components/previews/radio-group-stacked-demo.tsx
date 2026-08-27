import { RadioGroupStacked, RadioGroupStackedItem } from "@nebutra/ui/primitives";

export function RadioGroupStackedDemo() {
  return (
    <div className="max-w-md px-4 py-8 w-full">
      <RadioGroupStacked defaultValue="standard" className="w-full">
        <RadioGroupStackedItem value="standard" id="delivery-standard">
          <div className="flex w-full justify-between">
            <div>
              <div className="font-medium">Standard Shipping</div>
              <div className="text-sm mt-1 text-muted-foreground">5–7 business days</div>
            </div>
            <div className="font-medium">Free</div>
          </div>
        </RadioGroupStackedItem>
        <RadioGroupStackedItem value="express" id="delivery-express">
          <div className="flex w-full justify-between">
            <div>
              <div className="font-medium">Express Shipping</div>
              <div className="text-sm mt-1 text-muted-foreground">2–3 business days</div>
            </div>
            <div className="font-medium">$9.99</div>
          </div>
        </RadioGroupStackedItem>
        <RadioGroupStackedItem value="overnight" id="delivery-overnight">
          <div className="flex w-full justify-between">
            <div>
              <div className="font-medium">Overnight Shipping</div>
              <div className="text-sm mt-1 text-muted-foreground">Next business day</div>
            </div>
            <div className="font-medium">$19.99</div>
          </div>
        </RadioGroupStackedItem>
      </RadioGroupStacked>
    </div>
  );
}
