import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import SuperAdminSidebar from "@/components/layout/superadmin/Sidebar";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || !isSuperAdmin(session)) {
    redirect("/superadmin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <SuperAdminSidebar user={{ name: session.name, email: session.email }} />
      <main className="flex-1 flex flex-col">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
