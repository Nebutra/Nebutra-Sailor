import { MessageWithReactions, ReactionChip } from "@nebutra/ui/primitives";
import { useState } from "react";

export default function MessageWithReactionsDemo() {
  const [selected, setSelected] = useState<string>();

  return (
    <div className="gap-6 flex flex-col items-start">
      {/* Pre-composed message with reactions */}
      <MessageWithReactions text="Great work on this feature! 🚀" />

      {/* Standalone chip */}
      <ReactionChip onSelect={setSelected} selected={selected} />
    </div>
  );
}
