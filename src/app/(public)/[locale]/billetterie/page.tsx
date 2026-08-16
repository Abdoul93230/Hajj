"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Ticket } from "lucide-react";

export default function BilletterePage() {
  const t = useTranslations("comingSoon");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setSubscribed(true);
  }

  return (
    <div className="py-24 min-h-[60vh] flex items-center">
      <div className="max-w-lg mx-auto px-4 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ticket size={36} className="text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{t("title")}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">{t("message")}</p>
        {subscribed ? (
          <p className="text-[#0f5132] font-semibold">{t("notifiedSuccess")}</p>
        ) : (
          <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm mx-auto">
            <input
              required type="email" placeholder={t("emailPlaceholder")} value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button type="submit" className="bg-[#0f5132] text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-[#0f5132] transition-colors text-sm whitespace-nowrap">
              {t("subscribe")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
