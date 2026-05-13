"use client";

import { ShieldCheck, CrossCircle as XCircle } from "@nebutra/icons";
import { StatusBadge } from "@nebutra/ui/primitives";

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
