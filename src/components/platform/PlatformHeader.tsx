import Image from "next/image";
import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { PLATFORM_LOGO_URL, PLATFORM_NAME } from "@/lib/platform-brand";

/** Sections de la landing (ancres de la page unique). */
const SECTIONS = [
  { id: "features", key: "features" },
  { id: "how", key: "how" },
  { id: "audiences", key: "audiences" },
  { id: "domains", key: "domains" },
  { id: "plans", key: "plans" },
  { id: "faq", key: "faq" },
] as const;

const LOCALE_LABELS: Record<string, string> = { fr: "FR", en: "EN", ar: "AR" };

/**
 * En-tête de la LANDING plateforme (aucun thème d'agence : on reste sur les
 * couleurs par défaut de la plateforme).
 */
export default async function PlatformHeader({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "platform.nav" });

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
        {/* Marque — logo officiel hajj-e */}
        <Link href="/" locale={locale} className="flex items-center gap-2.5 flex-shrink-0">
          <Image
            src={PLATFORM_LOGO_URL}
            alt={PLATFORM_NAME}
            width={132}
            height={36}
            priority
            className="h-9 w-auto"
          />
          <span className="hidden sm:block text-[9px] font-bold uppercase tracking-[0.18em] text-ink-soft leading-tight">
            Hadj &amp; Oumra
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-1 mx-auto">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-3 py-2 rounded-lg text-[13px] font-medium text-ink-muted hover:text-ink hover:bg-cream transition-colors"
            >
              {t(s.key)}
            </a>
          ))}
        </nav>

        {/* Langues + accès */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-line p-0.5">
            {routing.locales.map((l) => (
              <Link
                key={l}
                href="/"
                locale={l}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                  l === locale
                    ? "bg-brand-deep text-white"
                    : "text-ink-muted hover:text-ink hover:bg-cream"
                }`}
              >
                {LOCALE_LABELS[l] ?? l.toUpperCase()}
              </Link>
            ))}
          </div>

          <NextLink
            href="/agency-admin/login"
            className="px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
          >
            {t("agencySpace")}
          </NextLink>
        </div>
      </div>
    </header>
  );
}
