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
import "../../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Hajj et Oumra ZAM",
    default: "Hajj et Oumra ZAM — Agence Hadj & Oumra",
  },
  description:
    "Hajj et Oumra ZAM, fidèle à ses engagements. Organisation de forfaits Hadj et Oumra adaptés aux besoins des pèlerins depuis Niamey, Niger.",
  icons: {
    icon: "/image ZAM/logo.png",
    shortcut: "/image ZAM/logo.png",
    apple: "/image ZAM/logo.png",
  },
  openGraph: {
    title: "Hajj et Oumra ZAM — Agence Hadj & Oumra",
    description: "Organisation de forfaits Hadj et Oumra depuis Niamey, Niger.",
    images: [{ url: "/image ZAM/logo.png", width: 512, height: 512, alt: "Hajj et Oumra ZAM" }],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Hajj et Oumra ZAM",
    description: "Organisation de forfaits Hadj et Oumra depuis Niamey, Niger.",
    images: ["/image ZAM/logo.png"],
  },
};

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
      <NextIntlClientProvider messages={messages}>
        <DirectionSetter />
        <Header user={session ? { name: session.name, role: session.role, photoUrl } : null} />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </NextIntlClientProvider>
    </div>
  );
}
