"use client";

import IconWhatsApp from "@/components/ui/IconWhatsApp";
import { useTenantBranding } from "@/components/tenant/TenantBranding";
import { contactDigits } from "@/lib/contact";

export default function WhatsAppButton() {
  const branding = useTenantBranding();
  const number = contactDigits(branding?.whatsappNumber);

  // Aucun WhatsApp configuré pour cette agence → pas de bouton flottant.
  // (JAMAIS de numéro d'une autre agence en secours.)
  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white"
      style={{ backgroundColor: "#25d366" }}
      aria-label="WhatsApp"
    >
      <IconWhatsApp size={28} />
    </a>
  );
}
