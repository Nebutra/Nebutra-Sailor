import { AdminUsersList } from "@/components/admin/admin-users-list";

export default function AdminUsersPage() {
  return <AdminUsersList initialPage={1} pageSize={20} />;
}
