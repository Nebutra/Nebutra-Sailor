"use client";

import { StatusBadge } from "@nebutra/ui/primitives";
import { ShieldCheck, XCircle } from "lucide-react";

export function StatusBadgeDemo() {
  return (
    <StatusBadge
      leftIcon={ShieldCheck}
      rightIcon={XCircle}
      leftLabel="Protection"
      rightLabel="SSO disabled"
      status="success"
    />
  );
}
