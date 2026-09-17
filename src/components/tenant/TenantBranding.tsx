"use client";

import { createContext, useContext } from "react";
import type { TenantBranding } from "@/lib/tenant-theme";

// Branding du tenant courant (textes résolus pour la locale active).
// Fourni par le layout public ; null en dehors (print, superadmin…) → fallbacks.
const Ctx = createContext<TenantBranding | null>(null);

export function TenantBrandingProvider({
  value,
  children,
}: {
  value: TenantBranding;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTenantBranding(): TenantBranding | null {
  return useContext(Ctx);
}