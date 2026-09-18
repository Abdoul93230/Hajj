import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import DirectionSetter from "@/components/ui/DirectionSetter";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getTenantBySlug } from "@/lib/tenant-data";
import { readTenantBranding, themeStyleTag } from "@/lib/tenant-theme";
import { TenantBrandingProvider } from "@/components/tenant/TenantBranding";
import "../../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800"],
});

export const dynamic = "force-dynamic";

const FALLBACK_NAME = "Hajj et Oumra ZAM";
const FALLBACK_DESCRIPTION =
  "Hajj et Oumra ZAM, fidèle à ses engagements. Organisation de forfaits Hadj et Oumra adaptés aux besoins des pèlerins depuis Niamey, Niger.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tenantSlug = (await headers()).get("x-tenant-slug") ?? "";
  const tenant = tenantSlug
    ? await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { name: true, theme: true } })
    : null;
  const name = tenant?.name ?? FALLBACK_NAME;
  const branding = readTenantBranding(tenant?.theme, locale, name);
  const logoUrl = branding.logoUrl ?? "/image ZAM/logo.png";
  const description = branding.metaDescription ?? FALLBACK_DESCRIPTION;

  return {
    title: {
      template: `%s | ${name}`,
      default: `${name} — Agence Hadj & Oumra`,
    },
    description,
    icons: {
      icon: logoUrl,
      shortcut: logoUrl,
      apple: logoUrl,
    },
    openGraph: {
      title: `${name} — Agence Hadj & Oumra`,
      description,
      images: [{ url: logoUrl, width: 512, height: 512, alt: name }],
      locale: "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: name,
      description,
      images: [logoUrl],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
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

  const messages = await getMessages();
  const session = await getSession();

  // ── Thème du tenant (couleurs de marque) ───────────────────────────────────
  // Le slug est posé par le middleware (host en prod, DEV_DEFAULT_TENANT en dev).
  const tenantSlug = (await headers()).get("x-tenant-slug") ?? "";
  // Dédupliqué par requête (React cache) — voir lib/tenant-data.ts
  const tenantForTheme = tenantSlug ? await getTenantBySlug(tenantSlug) : null;
  const branding = readTenantBranding(
    tenantForTheme?.theme,
    locale,
    tenantForTheme?.name ?? FALLBACK_NAME
  );

  // Photo de profil de l'utilisateur connecté (affichée dans le header)
  // 1) user.photoUrl (photo définie par l'agence)
  // 2) fallback : photo de pèlerin — son document PHOTO en attente ou validé
  let photoUrl: string | null = null;
  if (session) {
    const u = await prisma.user.findUnique({
      where: { id: session.id },
      select: { photoUrl: true },
    });
    photoUrl = u?.photoUrl ?? null;

    if (!photoUrl) {
      const photoDoc = await prisma.pilgrimDocument.findFirst({
        where: {
          userId: session.id,
          type: "PHOTO",
          status: { not: "REJECTED" },
          // exclure les PDF (pas affichables en avatar)
          fileUrl: { not: { endsWith: ".pdf" } },
        },
        orderBy: { createdAt: "desc" },
        select: { fileUrl: true },
      });
      photoUrl = photoDoc?.fileUrl ?? null;
    }
  }

  return (
    <div
      className={`${inter.variable} ${playfair.variable} min-h-screen flex flex-col`}
      style={{ fontFamily: "var(--font-inter), Arial, sans-serif", backgroundColor: "#f8fafc", color: "#111827" }}
    >
      {/* Couleurs de marque du tenant — écrase les défauts :root de globals.css */}
      <style id="tenant-theme" dangerouslySetInnerHTML={{ __html: themeStyleTag(tenantForTheme?.theme) }} />
      <TenantBrandingProvider value={branding}>
        <NextIntlClientProvider messages={messages}>
          <DirectionSetter />
          <Header user={session ? { name: session.name, role: session.role, photoUrl } : null} />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppButton />
        </NextIntlClientProvider>
      </TenantBrandingProvider>
    </div>
  );
}
