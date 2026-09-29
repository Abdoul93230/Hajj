import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import PlatformHeader from "@/components/platform/PlatformHeader";
import PlatformFooter from "@/components/platform/PlatformFooter";
import DevModeSwitch from "@/components/dev/DevModeSwitch";
import "../../../globals.css";

/*
 * ── LANDING DE LA PLATEFORME ────────────────────────────────────────────────
 * Servie sur les domaines RACINE (hajj-e.com, www.hajj-e.com) et, en dev, quand
 * le cookie « zam_dev_mode=platform » est actif.
 *
 * Chemin PHYSIQUE : /<locale>/platform — le middleware le masque (rewrite) pour
 * que le visiteur ne voie que /fr, /en, /ar. La locale reste en PREMIER segment
 * (next-intl en déduit <html lang/dir> côté serveur, y compris en arabe).
 * Aucun thème d'agence ici : la landing reste sous l'identité de la plateforme.
 */

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "platform.meta" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      locale,
    },
  };
}

export default async function PlatformLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "fr" | "en" | "ar")) {
    notFound();
  }

  // Rend la locale disponible aux composants serveur de l'arbre (getTranslations).
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <div
      className={`${inter.variable} ${playfair.variable} min-h-screen flex flex-col bg-white`}
      style={{ fontFamily: "var(--font-inter), Arial, sans-serif" }}
    >
      <NextIntlClientProvider messages={messages}>
        <PlatformHeader locale={locale} />
        <main className="flex-1">{children}</main>
        <PlatformFooter locale={locale} />
        {/* Bascule dev uniquement : jamais rendue en production */}
        {process.env.NODE_ENV !== "production" && <DevModeSwitch current="platform" />}
      </NextIntlClientProvider>
    </div>
  );
}
