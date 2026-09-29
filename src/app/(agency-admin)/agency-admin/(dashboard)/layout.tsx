import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { isAgencyMember } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant-data";
import { resolveLogoUrl, themeStyleTag } from "@/lib/tenant-theme";
import AgencyAdminSidebar from "@/components/layout/agency-admin/Sidebar";
import AgencyAdminTopbar from "@/components/layout/agency-admin/Topbar";
import { prisma } from "@/lib/prisma";
import ForcePasswordChange from "./ForcePasswordChange";

export default async function AgencyAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";

  if (!session || !isAgencyMember(session)) {
    redirect("/agency-admin/login");
  }

  if (session.role !== "SUPER_ADMIN" && session.tenantSlug !== tenantSlug) {
    redirect("/agency-admin/login");
  }

  // Dédupliqué par requête (React cache) — voir lib/tenant-data.ts
  const tenant = await getTenantBySlug(tenantSlug);
  const tenantName = tenant?.name ?? tenantSlug;
  // Si l'agence est suspendue ou annulée, l'accès au tableau de bord est bloqué
  if (tenant && tenant.status !== "ACTIVE" && tenant.status !== "TRIAL") {
    redirect("/agency-admin/login?error=suspended");
  }


  // ── Mot de passe provisoire imposé ─────────────────────────────────────────
  // Lu en base à chaque requête : levé à la création du compte par le
  // superadmin ou après réinitialisation, baissé par /api/auth/change-password.
  const account = await prisma.user.findUnique({
    where: { id: session.id },
    select: { mustChangePassword: true },
  });

  // ── Système de sélection d'année ──────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const minYear = tenant ? tenant.createdAt.getFullYear() : currentYear;

  const availableYears: number[] = [];
  for (let y = currentYear; y >= minYear; y--) availableYears.push(y);

  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const parsedCookieYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear =
    !isNaN(parsedCookieYear) && parsedCookieYear >= minYear && parsedCookieYear <= currentYear
      ? parsedCookieYear
      : currentYear;
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Couleurs de marque du tenant de l'agence connectée */}
      <style id="tenant-theme" dangerouslySetInnerHTML={{ __html: themeStyleTag(tenant?.theme) }} />
      <AgencyAdminSidebar
        user={{ name: session.name, email: session.email, role: session.role }}
        tenantName={tenantName}
        tenantSlug={tenantSlug}
        logoUrl={resolveLogoUrl(tenant?.theme)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AgencyAdminTopbar
          user={{ name: session.name, role: session.role }}
          tenantName={tenantName}
          selectedYear={selectedYear}
          availableYears={availableYears}
        />
        <main className="flex-1 overflow-y-auto p-6 w-full">
          {children}
        </main>
      </div>
      {account?.mustChangePassword && <ForcePasswordChange />}
    </div>
  );
}
