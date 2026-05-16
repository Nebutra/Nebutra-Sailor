import { redirect } from "next/navigation";
import { resolveAuditRouteTarget } from "./route-target";

export default function AuditPage() {
  redirect(resolveAuditRouteTarget());
}
