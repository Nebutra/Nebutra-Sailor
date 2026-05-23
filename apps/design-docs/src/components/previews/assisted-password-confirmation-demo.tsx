import { AssistedPasswordConfirmation, Badge } from "@nebutra/ui/primitives";
import { useState } from "react";

export function AssistedPasswordConfirmationDemo() {
  const [match, setMatch] = useState(false);

  return (
    <div className="max-w-sm p-6 space-y-6 mx-auto w-full">
      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold tracking-tight">Confirm Password</h3>
        <p className="text-sm font-medium text-muted-foreground">
          Verify your password to continue.
        </p>
      </div>

      <AssistedPasswordConfirmation
        password="nebutra2026!"
        placeholder="Type password..."
        onMatch={() => setMatch(true)}
      />

      <div className="mt-4 h-8 flex items-center justify-center">
        {match && (
          <Badge variant="success" className="animate-in fade-in zoom-in">
            Passwords Match
          </Badge>
        )}
      </div>
    </div>
  );
}
