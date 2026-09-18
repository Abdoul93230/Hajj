"use client";

import type { ReactNode } from "react";
import { useTenantBranding } from "@/components/tenant/TenantBranding";
import { telLink, waLink } from "@/lib/contact";

/**
 * Lien WhatsApp branché sur le branding du tenant (contexte du layout public).
 * Rend null si l'agence n'a pas configuré de numéro — jamais de numéro d'une
 * autre agence en secours.
 */
export function WaLink({
  children,
  className,
  text,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  text?: string;
  ariaLabel?: string;
}) {
  const branding = useTenantBranding();
  const href = waLink(branding?.whatsappNumber, text);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

/** Lien téléphone branché sur le branding du tenant (null si non configuré). */
export function TelLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const branding = useTenantBranding();
  const href = telLink(branding?.phone);
  if (!href) return null;
  return <a href={href} className={className}>{children}</a>;
}
