"use client";

import IconWhatsApp from "@/components/ui/IconWhatsApp";
import { useTenantBranding } from "@/components/tenant/TenantBranding";

export default function WhatsAppButton() {
  const branding = useTenantBranding();
  const number = (branding?.whatsappNumber ?? "22791882121").replace(/\D/g, "");

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
