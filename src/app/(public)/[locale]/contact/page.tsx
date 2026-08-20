"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { MapPin, Phone, Send } from "lucide-react";
import IconWhatsApp from "@/components/ui/IconWhatsApp";

export default function ContactPage() {
  const t = useTranslations("contact");
  const ta = useTranslations("about");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  function openWhatsApp() {
    const text = encodeURIComponent(
      t("whatsappTemplate", { name: form.name, subject: form.subject, message: form.message })
    );
    window.open(`https://wa.me/22791882121?text=${text}`, "_blank");
  }

  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t("title")}</h1>
          <p className="text-gray-600 text-lg">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Contact form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send size={28} className="text-[#0f5132]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t("success")}</h3>
                <p className="text-gray-600">{t("successSub")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")} *</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("email")}</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("phone")}</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("subject")} *</label>
                    <input
                      required
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("message")} *</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#0f5132] text-white font-semibold py-3 rounded-lg hover:bg-[#0f5132] transition-colors disabled:opacity-50"
                  >
                    {loading ? t("sending") : t("sendEmail")}
                  </button>
                  <button
                    type="button"
                    onClick={openWhatsApp}
                    className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <IconWhatsApp size={18} />
                    {t("send")}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Contact info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">{t("infoTitle")}</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-[#0f5132] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">{ta("address")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-[#0f5132] flex-shrink-0" />
                  <div className="text-sm text-gray-600">
                    <p>{ta("phone1")}</p>
                    <p>{ta("phone2")}</p>
                  </div>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/22791882121"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-green-500 text-white font-semibold py-4 rounded-xl hover:bg-green-400 transition-colors"
            >
              <IconWhatsApp size={22} />
              {t("whatsapp")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
