"use client";

import { permissionLabel } from "@/config/adminPermissions";
import { useAdminSession } from "@/stores/admin";
import StaffProfilePage from "../Staff/StaffProfilePage";

const AdminProfilePage = () => {
  const { account } = useAdminSession();
  if (!account) return null;
  const isSuper = account.role === "super-admin";

  return (
    <StaffProfilePage
      surface="admin"
      roleLabel={isSuper ? "Super admin" : "Admin"}
      emailNote={isSuper ? "Another super admin can change it on the Staff page." : "A super admin or staff manager can change it."}
      access={
        isSuper ? (
          <p className="text-sm text-secondary/70">You can open every page of the admin panel.</p>
        ) : (
          <ul aria-label="Pages you can open" className="flex flex-wrap gap-1.5">
            {account.permissions.map((key) => (
              <li key={key} className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary/85">
                {permissionLabel(key)}
              </li>
            ))}
          </ul>
        )
      }
    />
  );
};

export default AdminProfilePage;
