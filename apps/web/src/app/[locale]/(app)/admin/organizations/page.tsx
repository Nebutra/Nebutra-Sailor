import { AdminOrganizationsList } from "@/components/admin/admin-organizations-list";

export default function AdminOrganizationsPage() {
  return <AdminOrganizationsList initialPage={1} pageSize={20} />;
}
