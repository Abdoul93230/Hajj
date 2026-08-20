"use client";
import IconWhatsApp from "@/components/ui/IconWhatsApp";

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/22791882121"
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
