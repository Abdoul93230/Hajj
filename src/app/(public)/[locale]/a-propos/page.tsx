import { useTranslations } from "next-intl";
import { MapPin, Phone, Award } from "lucide-react";

export default function AboutPage() {
  const t = useTranslations("about");

  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t("title")}</h1>
          <p className="text-gray-600 text-lg">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("missionTitle")}</h2>
              <p className="text-gray-600 leading-relaxed">{t("missionText")}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("historyTitle")}</h2>
              <p className="text-gray-600 leading-relaxed">{t("historyText")}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Award size={20} className="text-[#0f5132] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">{t("accreditation")}</p>
                  <p className="text-sm text-gray-500">{t("group")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-[#0f5132] mt-0.5 flex-shrink-0" />
                <p className="text-gray-600 text-sm">{t("address")}</p>
              </div>

              <div className="flex items-center gap-3">
                <Phone size={20} className="text-[#0f5132] flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  <p>{t("phone1")}</p>
                  <p>{t("phone2")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "1998", label: t("statsYear") },
              { value: "+1 000", label: t("statsPilgrims") },
              { value: "4.9/5", label: t("statsSatisfaction") },
              { value: "100%", label: t("statsCompletion") },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-emerald-50 rounded-2xl p-6 text-center border border-emerald-100"
              >
                <p className="text-3xl font-bold text-[#0f5132] mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
