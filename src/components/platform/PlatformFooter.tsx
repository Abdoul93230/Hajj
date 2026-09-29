import { Compass, Mail } from "lucide-react";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";

/** Adresse de contact de la plateforme (surchargeable par .env). */
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ?? "contact@hajj-e.com";

const PLATFORM_LINKS = [
  { id: "features", key: "features" },
  { id: "how", key: "how" },
  { id: "plans", key: "plans" },
  { id: "faq", key: "faq" },
] as const;

/** Pied de page de la LANDING plateforme (indépendant des agences). */
export default async function PlatformFooter({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "platform.footer" });
  const tNav = await getTranslations({ locale, namespace: "platform.nav" });
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-deep text-white/70">
      <div className="max-w-6xl mx-auto px-5 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* Marque */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Compass className="w-5 h-5 text-gold-light" strokeWidth={2} />
            </span>
            <span className="font-black text-white text-sm tracking-tight">
              HajjManager <span className="text-gold-light">Pro</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed">{t("tagline")}</p>
        </div>

        {/* Plateforme */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold-light mb-3">
            {t("platformTitle")}
          </p>
          <ul className="space-y-2 text-sm">
            {PLATFORM_LINKS.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} className="hover:text-white transition-colors">
                  {tNav(l.key)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Espaces */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold-light mb-3">
            {t("spacesTitle")}
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <NextLink href="/agency-admin/login" className="hover:text-white transition-colors">
                {t("agencySpace")}
              </NextLink>
            </li>
            <li>
              <NextLink href="/superadmin/login" className="hover:text-white transition-colors">
                {t("superadminSpace")}
              </NextLink>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold-light mb-3">
            {t("contactTitle")}
          </p>
          <p className="text-sm leading-relaxed mb-3">{t("contactDesc")}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-gold-light transition-colors"
          >
            <Mail className="w-4 h-4" strokeWidth={2} />
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/45">
          <p>
            {t("editor")} © {year} — {t("rights")}
          </p>
          <p className="font-bold tracking-widest uppercase text-[10px]">HajjManager Pro • v1.0</p>
        </div>
      </div>
    </footer>
  );
}
