import type { Metadata } from "next";
import { headers } from "next/headers";
import AgencyLoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Connexion Admin Agence" };

export default async function AgencyLoginPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-green-700 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
            {tenantSlug ? tenantSlug.charAt(0).toUpperCase() : "A"}
          </div>
          <h1 className="text-gray-900 text-2xl font-bold capitalize">
            {tenantSlug || "Agence"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Espace administration</p>
        </div>
        <AgencyLoginForm defaultTenantSlug={tenantSlug} isDev={isDev} />
      </div>
    </div>
  );
}
