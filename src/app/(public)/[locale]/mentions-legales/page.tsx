import { useTranslations } from "next-intl";

export default function MentionsLegalesPage() {
  const t = useTranslations("placeholder");
  return (
    <div className="py-16 max-w-3xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Mentions Légales</h1>
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 text-gray-600">
        <p>{t("message")}</p>
      </div>
    </div>
  );
}
